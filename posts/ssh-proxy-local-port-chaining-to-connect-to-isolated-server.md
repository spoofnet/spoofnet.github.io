---
title: SSH Proxy Local Port Chaining to connect to an Isolated Server
slug: ssh-proxy-local-port-chaining-to-connect-to-isolated-server
date: 2020-04-25 00:36
category: devops
---

There you are with Internet access to an [AWS EC2 instance](https://aws.amazon.com/ec2/), [Azure Virtual Machine](https://azure.microsoft.com/en-gb/services/virtual-machines/) or [VPS (Virtual Private Server)](https://www.vultr.com/products/cloud-compute/) as we called them in the good old days, but beyond that - on a Private LAN of some sort (could be an AWS VPC, Azure VNET or Physical LAN) - there is another Server, which only has a Private IP Address. This pesky Server is what you'd like to access SQL Developer on, from your own PC. Hmm...

## Diagram time
Here's a more descriptive Network Diagram, showing more specifics around the issue, namely:

- Your PC/Mac/Laptop
 - Private IP doesn't matter
 - Public IP is `99.99.99.1`
- Internet-accessible VM
 - Public IP is `1.1.1.1`
 - This is allowed through an Internal Firewall to SSH to `172.30.12.99` (sourced from it's LAN Private IP of `172.30.12.6`)
 - This is **not** allowed to connect on SQL Database (`TCP/3306`) to your `172.30.12.99` Database Server
- Database VM
 - No Public IP (not directly accessible from the Internet)
 - Private IP is `172.30.12.99`
 - Has SSH Daemon/Server and SQL Server installed on it

![SSH Proxy Local Port Chaining Topology](/static/img/ssh_proxy_local_port_chaining.png)

The ultimate goal is to enable SQL Developer on your PC to somehow speak to SQL Server (`TCP/3306`) on `172.30.12.99`.

## SSH Tunnels - Local Port Proxy
Which is where a handy feature of SSH comes in, where it has the ability to Tunnel.

### Dynamic Port Tunneling (SOCKS Proxy)
You may have used this prior with [Dynamic Port Tunneling](https://dev.to/__namc/ssh-tunneling---local-remote--dynamic-34fa), where you do something like this:

<pre><code>ssh -D 1080 user@1.1.1.1</code></pre>

Then configure `127.0.0.1:1080` as a SOCKS4 or SOCKS5 Proxy in your Firefox Browser like this:

![Firefox SSH SOCKS Proxy Options Screen](/static/img/firefox_proxy.png)

And then you can browse some http://internalserver in your Firefox Browser as if you're controlling/appear to be the Internet-connected VM to upstream Servers/Systems. That won't help you here, mind.

### Local Port Tunneling
Instead, we're going to use Local Port tunneling, which looks a bit like this:

<pre><code>ssh user@1.1.1.1 -L 999:127.0.0.1:3306</code></pre>

It's worth breaking down what this does, with some notes:

- `999`
 - This is the port that will be listening on your PC (i.e. `127.0.0.1` or `localhost`, from your perspective)
 - Any traffic sent to this port is chucked through the Tunnel, for the other side (SSH Server on `1.1.1.1`) to deal with
- `127.0.0.1`
 - This is where you want the other side (`1.1.1.1`) to send your Tunneled traffic to (Destination IP Address)
    - Note in this case, it is itself; the `127.0.0.1` here refers to `1.1.1.1` going to itself, not your PC
    - Think of stuff after the first `-L` colon as "remote-side stuff"
- `3306`
 - This is where you want the other side (`1.1.1.1`) to send your Tunneled traffic to (Destination TCP Port)
 - This is the TCP-using process (in our case, it'll be another SSH not SQL, as you might think) on the other side (`1.1.1.1`)`

In our case, this wouldn't do much - as there is no Database Server (`TCP/3306`) running on our first Jump Box (`1.1.1.1`) - so the next bit is where the chaining comes in.

### Local Port Chaining
Leaving this SSH session (above) open, we open a fresh Terminal/Command Prompt/SSH session from our PC to `1.1.1.1`, with no Tunnels requested (bog standard SSH):

<pre><code>ssh user@1.1.1.1</code></pre>

Using this, we now tell `1.1.1.1` to SSH to our target Database (`172.30.12.99`), but this time we want the traffic to pop out at the actual Database Port (`3306`):

<pre><code>ssh user@172.30.12.99 -L 3306:127.0.0.1:3306</code></pre>

Finally, we can now connect to `127.0.0.1:999` on the PC, and it will traverse the two SSH Tunnels and pop out as being `172.30.12.99:3306` - even though that destination doesn't have Internet access.

Note in the above that the choice of using `-L 3306` on the `1.1.1.1` PC is irrelevant; this could have been `998`; but then the SSH command run against `172.30.12.99` would have had to read `-L 998` instead of `-L 3306`. All you are doing here is setting up listeners, and matching that number up between the two SSH Commands.

## What it achieves
![SSH Proxy Local Port Chaining Resulting Topology](/static/img/ssh_proxy_local_port_chaining_resulting.png)

Which gets you out of a hole, and able to access a "Bastion" Server on a Private LAN or VNET somewhere, as long as you've got SSH access throughout the chain.

Have fun tinkering!

---
title: Juniper SRX Overlay and Underlay VRF-seperated GRE Tunnels
slug: juniper-srx-overlay-underlay-gre-tunnel-vrfs
date: 2020-08-22 14:18
category: networking
---

Are you used to Cisco IOS kit and trying to make a GRE Tunnel extend an Overlay VRF (or Routing Instance), using Junos SRX kit, and getting weird errors like this:

```
(errno=1000) create nsp tunnel failed 1
(errno=1000) tunnel session add(gr-0/0/0) failed
```

Then read on, dear friend - this post's for you.

## Diagram time
This is what we're trying to achieve, namely:

- Underlay Network
 - MPLS IP VPN with own BGP/IGP routing setup
 - Two Juniper SRX Firewalls in two locations, connected to said MPLS IP VPN
 - Underlying Global Table or VRF "Prod" that those Firewalls connect to
 - Each Firewall has 1x 10 Gig Ethernet connection, Xe-0/0/1, connected to the MPLS IP VPN
- Overlay Network
 - Routing Instance (VRF/Routing Table) called "Other" present on each Juniper SRX Firewall
 - We want to join together VRF "Other" on each SRX Firewall to each other, using a GRE Tunnel Gr-0/0/0.1 to extend them
 - We'll spin up a Routed /30 p2p atop this GRE Tunnel, so we can Static Route to it, each side, to get traffic from SiteA to SiteB

![Juniper Overlay GRE Tunnel Topology](/static/img/juniper_srx_vrf-based_gre_tunnel.png)

The ultimate goal is for `Gr-0/0/0.1` on each SRX to be able to talk to each other's `192.168.99.x` IP directly, over the GRE Tunnel (which gets transited atop the Underlay MPLS IP VPN, VRF "Prod").

## What your Cisco mind tells you might work
This isn't your first GRE rodeo, you've played this game before, and done something similar on Cisco IOS kit, like this:

```
interface Tunnel99
 description GRE Tunnel to SiteB Tun99
 ip vrf forwarding Other
 ip address 192.168.99.1 255.255.255.252
 ip mtu 1476
 tunnel source 10.0.0.7
 tunnel destination 10.1.0.98
```

That worked well for you, so you reckon some config conversion like this might bear some fruit:

```
set interfaces gr-0/0/0 unit 1 description "GRE Tunnel to SiteB Gr-0/0/0.1"
set interfaces gr-0/0/0 unit 1 tunnel source 10.0.0.7
set interfaces gr-0/0/0 unit 1 tunnel destination 10.1.0.98
set interfaces gr-0/0/0 unit 1 tunnel routing-instance destination Other
set interfaces gr-0/0/0 unit 1 family inet mtu 1476
set interfaces gr-0/0/0 unit 1 family inet address 192.168.99.1/30
!
set routing-instances Other interface gr-0/0/0.1
```

That'll do it, right?

Nope.

## What the Juniper SRX errors to fight back
So you try your `ping 192.168.99.2 routing-instance Other`, it fails miserably; then you go down to checking the Underlay Tunnel Source can ping the Tunnel Destination:

```
PING 10.1.0.98: 56 data bytes 64 bytes from 10.0.0.7:
icmp_seq=0 ttl=122 time=5.661 ms 64 bytes from 10.1.0.98
icmp_seq=1 ttl=122 time=6.619 ms 64 bytes from 10.1.0.98
```

Hmm, that's all fine, Alright, Juniper, what about a little `show log messages | last 10` then, eh?

```
Aug 21 23:00:03 node0.fpc1.pic0 IFP error> ../../../../../../../src/pfe/usp/control/applications/interface/ifp.c@3069:(errno=1000) tunnel session add(gr-0/0/0) failed
```

Huh, what's that all about?

## Hunting the Interwebs for clues
Time to invoke Dr Google then, and off we find this [similarly afflicted person with an SRX1400](https://forums.juniper.net/t5/SRX-Services-Gateway/SRX1400-Urgent-Request/td-p/286529), with this key scrap of thinking material:

> This error is when you need the static route if gr-0/0/0 and egress interface are in two different routing-instances. So you need to point the static route of the gr tunnel to the table that have the external interface.

It's not really sinking in, so you re-read it a few times; why does Junos care if my Gr-0/0/0.1 interface is in a different Routing Instance (VRF) to the Underlay, that's the point of the `...tunnel routing-instance destination Other` command, right, to tell it to set the destination of the Tunnel Endpoint into another Routing Table, right?

Nope.

## In Juniper land, Destination Sources you!
It's probably best if I show you the fix first, then this might click - here is the fix to suddenly make the Tunnel spring into life:

`set routing-instances Other routing-options static route 10.1.0.98/32 next-table Prod.inet.0`

_Note1: You'll need the other IP, for SiteA (10.0.0.7) as this inter-VRF Static Route for the other SiteB Firewall_

_Note2: You'll need to add that ".inet.0" to your Routing Instance name, because Junos and consistency don't mix._

So if you're like me, you're looking at that bemused, and saying to yourself: "But, but... I set the Tunnel Destination to look in a different VRF, right, otherwise what exactly is the point of that routing-instance destination command all about?".

Well, I'll tell you what I reckon it's to do, I think it's to set the __source__ of the Tunnel (i.e. what Cisco would call the "Tunnel Source") to use the Underlay (Prod VRF) to form; not, as the fecking word in the command reads, the Tunnel _Destination_. Hence, as there is no command that sets the destination, it assumes the Tunnel Destination is in the same VRF as the Tunnel itself, so you have to set an inter-VRF Static Route to tell it to go into the Underlay to form the GRE Tunnel.

It's the only way I can reconcile it in my head, with you needing to add he _destination_ route/prefix __as well as__ that `...tunnel routing-instance destination...` command.

## Conclusion
So there you go, in Junos land, this magic badly-named combo does what the sensibly-named `tunnel source` and `tunnel destination` combo does in Cisco IOS:

```
set interfaces gr-0/0/0 unit 1 tunnel source 10.0.0.7 #Note this is in VRF Prod underlay
set interfaces gr-0/0/0 unit 1 tunnel destination 10.1.0.98 #Note this is in VRF Prod underlay
set interfaces gr-0/0/0 unit 1 tunnel routing-instance destination Prod #Note this sets the VRF for the Tunnel Source
set routing-instances Other routing-options static route 10.1.0.98/32 next-table Prod.inet.0 #Note this inter-VRFs the Tunnel Destination
```

Mind you, in Juniper land opposites are clearly true, so maybe I should call this section the Introduction instead, seeing as it's at the end of the blog post.

If only Juniper sold mineral water, it'd be bottled at _destination_ instead.

Sorry, I'll _start_ now. Wait, do I mean _stop_...

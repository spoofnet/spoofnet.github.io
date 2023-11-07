---
title: Using Intel vPro AMT ME as a poor man's iLO for KVM
slug: using-intel-vpro-amt-me-as-a-poor-mans-ilo-for-kvm
date: 2019-01-21 22:09
category: compute
---

## Got Intel vPro AMT ME, bruv?
Recently I've been trying and failing to get [Nutanix Community Edition (CE)](https://www.nutanix.com/products/community-edition/) to cluster-up, with one ESXi-nested virtualised AHV/CVM and another physical AHV/CVM, running on an old HP Elite 8200 Small Form Factor Desktop PC. If you've played around with Nutanix, you'll know there's a lot of tinkering with the Host (Acropolis Hypervisor, AHV) Node to install the Controller Virtual Machine (CVM), and a bit of rebootery required; if you've been following this blog long, you'll realise that I'm not favoured with the Technology Gods - and my mileage often varies into many more reboots than the average bear.

When you're working with a frankenmachine (**ProTip** - Buy a 13-pin male Mini-SATA to 22-pin female SATA Converter to use the proprietary MicroSATA/Power Cable going into the CD Drive for an SSD), which you've put in your upstairs LAN Room, then the frequent trips up and down, and lugging a keyboard, video and mouse can get, well, annoying. Unless, that is, you've got Intel vPro, Active Management Technology (AMT) or Management Engine (ME) onboard your lovely business-class Laptop or PC - and then you can [use Intel's AMT VNC Server](https://blog.michael.kuron-germany.de/2011/10/using-intel-amts-vnc-server/).

## BIOS Time - Setting it up
> Most of the first part of this is the same as the How-to Geek article on [How to Remotely Control Your PC](https://www.howtogeek.com/56538/how-to-remotely-control-your-pc-even-when-it-crashes/) with some added time-saving, hair-tearing-out tips to follow later.

As with all good things in life (with PC hardware), the fun stuff happens in the BIOS. As per the links above, this is fairly simple:

- Take your old school keyboard, video and mouse (or USB Crash Cart KVM Adapter, if Christmas time has just been) and plug them into your vPro/AMT/ME-enabled Desktop or Laptop (well, not Laptop, obviously because it's got a keyb... never mind)
- Reboot
- Furiously tap Ctrl + P to get into the Intel ME Settings BIOS
- When asked for a password, unless you set it, it will be "admin" (without the speech marks)
- Enter "ME General Settings", and
  - Change the password to something more secure (it'll need to be at least one capital letter, one number and one special character)
  - Setup the Network IP for AMT - think of this the same as an iLO/iDRAC/BMC, you can either "Share" the Host OS's one (but why, as you're tied into that), or set a seperate, dedicated IP for just AMT Keyboard Video Mouse (KVM) access
  - Hit Enter and OK on "Active Network Access" (or this was all for nought)
  - Configure the DNS-related Hostname, DNS Server and related settings (maybe something like amt-&lt;PC-Hostname&gt;, so you can distinguish the two in your DNS later on)
- Enter "AMT Configuration", and
  - Enable the "Manageability Feature Selection"
  - Enable "SOL" (Serial-over-LAN)
  - Enable "IDER" (ISO/Image Remote Booting)
  - Enable "Legacy Redirection Mode" (By Legacy they mean "Using something sensible like VNC Viewer, rather than crappy Intel-proprietary KVM Viewers)
  - Enable "KVM Feature Selection"
  - Disable "User Opt-in"
    - If you leave it enabled, the non-existent person in front of the real keyboard/video/mouse that you plugged in will have to type a challenge/response string to allow you in, which defeats the point
  - Enable "Opt-in configurable from Remote IT"
    - For when you sit back at your desk, and realise you didn't do the step above
  - Escape/Escape/Escape/Yes/Save/OK

Now we've setup most of it, what can we do?

## Stage 1 - The ME Web GUI
Now you've done all that BIOS work, here comes the first payoff - a lovely Web User Interface you can access via http://&lt;AMT-IP-ADDRESS&gt;:16992, as per example below (my AMT IP is 10.0.0.12):

![Intel AMT WebUI Login Screen](/static/img/amt_webui_login.gif)

The kind of information you get to see here includes:

- System Information
 - Model, BIOS, Firmware etc.

![Intel AMT WebUI System Information Screen](/static/img/amt_webui_sysinfo.gif)

- Memory Information
 - Type, Number of DIMMs, Size etc.

![Intel AMT WebUI Memory Information Screen](/static/img/amt_webui_meminfo.gif)

- Disk Information
 - Type, Size, Manufacturer etc.

![Intel AMT WebUI Disk Information Screen](/static/img/amt_webui_diskinfo.gif)

- Event Logs
 - Last Power, Last Crash, Case Opened etc.

![Intel AMT WebUI Disk Event Logs Screen](/static/img/amt_webui_eventlogs.gif)

Then there's the juicy ones that you literally don't want (or have) to leave your chair for any more:

- Remote Power On/Off/Reboot
 - Including "Next Boot" actions (i.e. Boot to USB, Boot to BIOS etc)

![Intel AMT WebUI Disk Remote Control Screen](/static/img/amt_webui_remotecontrol.gif)

## Stage 2 - But Ma, where's my KVM?
If you've read this far, you're probably thinking you've been short-changed here; I promised you a KVM and I've delivered you a fancy Web GUI. So here's the fun part; you'll need one of the following to actually enable the VNC-based KVM functionality to work:

- (Windows App) [MeshCommander](https://www.meshcommander.com/meshcommander)
- (Windows App) [Intel Manageability Commander](https://downloadcenter.intel.com/product/97425/Intel-Manageability-Commander)
- (Windows SDK) Download Intel SDK, extract it some place and execute "KVMControlApplication.exe" (hiding away under the "Windows", and then "bin" directories (**ProTip** - You'll need to install Microsoft dotNET for this, so get a brew break ready), and you can then "Edit Machine Settings", login with "admin" and the &lt;AMT-PASSWORD&gt; you set earlier, and click "Machine Settings", then "Enabled - all ports" - as described in this [lovely blog post](https://blog.michael.kuron-germany.de/2011/10/using-intel-amts-vnc-server/)

Regardless of which you chose, here's a big tip - the "RFB Password" has to be exactly 8 characters, and include at least one each of the following:

- A capital letter
- A number
- A special character (i.e. @,'| etc.)

That tip right there saved you two hours of Googling "Error 400" and "XML invalid", and - my personal favourite - "KVM no respond" errors.

You can also do this from within MeshCommander, you click on the following sections, and then you'll get a prompt to chose the KVM "Enabled - all ports" and "RFB Password" (Intel-speak for "VNC Login Password")

![Intel AMT MeshCommander Enable KVM Screen](/static/img/amt_meshcommander_enable_kvm.gif)

## Stage 3 - Look Ma, no hands(-eyes engineer lugging his ass upstairs)!
Once done, you can now use a standard VNC Client* to connect via &lt;AMT-IP-ADDRESS&gt;:5900 the same you would with any other standard VNC Server:

> On Windows, only RealVNC seemed to work. On Mac OS X, only VNC Viewer seemed to work. On Linux (Debian), only Remmina seemed to work.

![Intel AMT VNC Remote Desktop](/static/img/amt_vnc_firstconnect.gif)

You'll then be prompted for the VNC Password (this is the pesky 8-character RFB Password):

![Intel AMT VNC Password Prompt](/static/img/amt_vnc_password.gif)

And finally given a lovely KVM VNC session into your vPro-enabled PC or Laptop:

![Intel AMT VNC Session](/static/img/amt_vnc_kvm.gif)

Et voila - the poor man's iDRAC/iLO/CIMC/&lt;BMC acronym of choice here&gt; is complete!

Note, if you have a Windows PC and don't want to enable the VNC (TCP/5900) part, then both MeshCommander and Intel Manageability Commander have a built-in, non-VNC KVM Client, which seems to speak some magical SOL/IDER "backdoor" protocol into the AMT chip, so they always work, regardless of you turning on/off the "Legacy ports" settings.

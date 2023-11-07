---
title: Network Billy - The world's greatest crap-looking SNMP Upload and Download tool
slug: network-billy-the-worlds-greatest-crap-looking-snmp-upload-and-download-tool
date: 2019-07-08 23:56
category: networking
---

## Is it Billy Network Designer, Billy the Kids or CSNMP-Tools?
I've no idea; when I was first shown this [lovely piece of software](https://cisco-snmp-tools-billy-the-kids.software.informer.com) by a beaming-faced colleague, I thought it was a piece of malware at best, or some Work Experience's idea of a joke. Everything about this software looks awful - just look at the GeoCities-inspired installer _bitmap_:

![Network Billy Installer Bitmap](/static/img/network_billy_installer.png)

I know, I know - "DON'T CLICK NEXT! IT'S DODGY, RUN, RUN FOR YOUR..." - but keep with it (and let me know whether it's called "Billy Network Designer", "Billy the Kid", "CSNMP-Tools" or "Cisco SNMP Tools", because the Start Menu Icon, Desktop Icon and Windows Titlebar all differ from each other...), because I guarantee you this is the **_finest tool you'll ever use_**:

![Network Billy Overview Screen](/static/img/network_billy_overview.jpg)

## Have you been drinking toilet cleaner again?
Drinking, yes; Toilet Duck, no.

This software is fantastic for NetOps-types because of the following killer features:

- Cisco Tools -&gt; Syslog and Debug Console
- Cisco Tools -&gt; Cisco Snmp Tool

This software is horrific (for anybody) because of the following (whatever-the-opposite-of-killer-is) "features":

- Map Mode
- Network Design
  - One minute in, and all of Visio's line-misalignment quirks are forgiven

**Don't** use it for those (although it's unusable anyway). **Do** use it for the SNMP Tool - it's the finest pre-DevOps thing (I know, I know - you cool kids can do this with a Python wrapper and Bash Script) to JFDI a config restore or download the running config - via _SNMP_, not CLI.

## Wait, did you say SNMP... for config files?
Yes, yes I did:

![Network Billy SNMP Config Restore Screen](/static/img/network_billy_snmp.jpg)

The reason this tool is the _ultimate_ "Get Out Of Jail Free" card (or for those of you in the Field, "Get To Pub On Time" card) is because of the ability to use this to do the following:

- Download a running-config or startup-config, via SNMP, using the RO or RW Community
- Upload a running-config or startup-config, via SNMP, using the RW Community
- Remotely reboot a Network Device, via SNMP, using the RW Community

> Remote Reboot works as long as you had the pre-thought to have the following CLI command in the active running-config:
> `snmp-server system-shutdown`

## Why this is so great
Sometimes, Cisco Network devices like to lock-up or have a memory leak. They'll continue to pass traffic (Data Plane), but their management instrumentation (Control Plane) - such as SSH or Telnet - will lock-up or die completely, leaving you up the creek without a "conf t" paddle. I've had this plenty of times, with plenty of ages of kit (older C3524-XL's; C3750-X; C2960 - probably nearly one of every non-NX-OS animal) - and when it's in some remote Campus or Branch Office somewhere, it's not always possible to get a skilled engineer/Console cable there, nor to get someone in to reboot the kit manually.

However, with Network Billy (as we've started calling it), you can quickly send an SNMP-based reboot to it; or even upload the specific delta command you wanted to apply with SSH/Telnet anyway. Other than this Control Plane lock-out situation, it can also bail you out for:

- That time when you change the "ip domain-name" but forget to regenerate/zeroise the RSA keypair, and SSH hangs on you
- That time when you change it to SSH Version 2, but it's crap old kit, so it goes to the unsupported SSH Version 1.99 - which no Terminal Emulator on earth seems able to connect to
- That time when you lock yourself out of SSH and Telnet login, because you thought it'd be a good Friday to try out the TACACS+/RADIUS/AAA change you've been wanting to do for a while
- That time you've got a Layer 2-only Switch, which only allows you to have one Management SVI, and it's time to re-IP it
- That time when you accidentally applied an ACL to block SSH and Telnet from the WAN-side, instead of the LAN-side
  - This one needs you to get creative, and RDP to a Desktop asset behind the LAN-side of the Switch, and run Network Billy from that to the LAN-side Default Gateway/SVI

I could go on - in short, I owe a few of my mortgage payments to [Network Billy](https://cisco-snmp-tools-billy-the-kids.software.informer.com), and it's mysterious Turkish creator.

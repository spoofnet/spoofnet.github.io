---
title: Juniper SRX Filter-based Forwarding (FBF) Policy Based Routing
slug: juniper-srx-fbf-policy-based-routing
date: 2022-09-15 15:22
category: networking
---

If you're a Cisco Guy (or Girl, I'm not biased; both sexes are welcome to the Cisco Pain Train), you'll likely have come across a need for [Policy Based Routing (PBR)](https://community.cisco.com/t5/networking-knowledge-base/how-to-configure-pbr/ta-p/3122774) to change the normal Destination IP-based logic of Network Routing to instead be a Source-IP or Interface-based logic, for some purpose of bypass. On Cisco gear, this is normally achieved via Route Maps or [Route Policy Language (RPL)](https://www.cisco.com/c/en/us/td/docs/routers/xr12000/software/xr12k_r4-0/routing/configuration/guide/rc40xr12k_chapter7.html) matching Access Control Lists (ACLs), Prefix Lists, Interfaces or some other attribute to match the desired traffic flows to "PBR" away from normal Routing.

Junos - or specifically [Filter-based Forwarding (FBF)](https://www.juniper.net/documentation/us/en/software/junos/routing-policy/topics/concept/firewall-filter-option-filter-based-forwarding-overview.html) - takes a very different approach to achieving this, which may take your "Cisco brain" a bit of context-switching to adapt to, namely:

- PBR (FBF) is performed within a new, _seperate_, Routing Instance (VR, Virtual Router, or VRF)
 - So all entry (ingress) / exit (egress) interfaces will need to be "imported" to also "attach" to this PBR-specific VRF
- FBF is applied _inbound_ on the _Source-facing_ interface
 - So normal, non-PBR traffic flow still needs to be _explicitly_ allowed through (otherwise it'll not just not be PBR'd, it'll be blocked from flowing entirely...)

## Worked example
A worked example probably helps here, so suppose we have the following:

- Zscaler Internet Access (or equivalent Security Service Edge [SSE] or Cloud-based Internet Firewall/Proxy)
 - Traffic is forced into [Zscaler via a GRE or IPsec Tunnel](https://help.zscaler.com/zia/best-practices-deploying-gre-tunnels) which runs atop the Internet into the closest/selected Zscaler Data Centre PoP (Point of Presence)
 - Zscaler (fake) Data Centre GRE Endpoint `165.225.99.99/32` acts as the far-side GRE Tunnel IP Endpoint/Peer
- 1 Gb Direct Internet Access (DIA) from `BigNetCo` with Private Allocated (PA) `192.0.2.0/24` IPv4 Address Block, effectively "leased" to `Your Company`
 - Static IPv4 /30 Handoff/Linknet `203.0.113.0/30` between Your Company and BigNetCo (out of `BigNetCo's` IPv4 Address Space)
- Default Route on your Juniper SRX towards VRF `"Zscaler-Internet"`
 - GRE Tunnel is transited via Underlay VRF `Internet`, but forms an extension of Overlay VRF `Zscaler-Internet` - that is, Default Route on LAN-side of Firewall forwards traffic (following the Default) via VRF `Zscaler-Internet` into the GRE Tunnel to Zscaler
 - Underlay VRF "Internet" only really exists to transit the GRE Tunnel itself (i.e. has a Static Route via next-hop `203.0.113.1` BigNetCo for GRE Peer Endpoint `165.225.99.99/32` only)
- VRF `Prod` exists as the only internal-facing DMZ/Security Zone, and routes the whole `10.0.0.0/8` Your Company Summary IPv4
 - Of this, most of `10.0.0.0/8` should have `"Normal Internet access"` - that is to say, flow via the GRE Tunnel to be scrubbed by Zscaler (i.e. appear to the Internet as a 165.x.x.x Zscaler Source IP)
 - Apart from `"Direct Internet access"` Subnet `10.2.0.0/24` - which (for reasons) needs to bypass Zscaler inspection and go direct to the Internet (i.e. appear to the Internet as a `192.0.2.0/24` Source IP)
  - And only then if they are going to `HTTPS` destinations; if they try and go to, say, `HTTP` or `DNS`, we want to send that via Zscaler inspection as per `"Normal Internet access"``

## Topology
A picture paints a thousand words, so that summates as:

![Juniper PBR Filter-based Forwarding Topology](/static/img/juniper_srx_pbr_internet.png)

## Configuration
Let's look at the raw config first, and then deconstruct it down to what this is doing. For brevity I've omitted the GRE Tunnel configuration, but if you're interested I suggest you read about [Juniper SRX Overlay and Underlay VRF-seperated GRE Tunnels](https://notworkd.com/post/juniper-srx-overlay-underlay-gre-tunnel-vrfs/).

Ditto, in practice you'd want to Source NAT (SNAT) the traffic to a Public IPv4 to make it routable on the Internet, but again, for brevity I'm omitting that and focusing only on the PBR-required configuration itself - as you might want to adopt similar for Private-to-Private PBR requirements.

```
set routing-instances Internet-Bypass-ZIA instance-type forwarding
set routing-instances Internet-Bypass-ZIA routing-options static route 0.0.0.0/0 next-hop 203.0.113.1
set routing-instances Internet-Bypass-ZIA routing-options instance-import POL_EXPORT_FROM_Prod-VRF_TO_Internet-Bypass-ZIA
set routing-instances Internet-Bypass-ZIA routing-options instance-import POL_EXPORT_FROM_Internet_TO_Internet-Bypass-ZIA
!
set firewall family inet filter PBR-BYPASS-ZSCALER-ZIA term PBR-DIRECT-INTERNET from source-address 10.2.0.0/24
set firewall family inet filter PBR-BYPASS-ZSCALER-ZIA term PBR-DIRECT-INTERNET from destination-address 0.0.0.0/0
set firewall family inet filter PBR-BYPASS-ZSCALER-ZIA term PBR-DIRECT-INTERNET from destination-port https
set firewall family inet filter PBR-BYPASS-ZSCALER-ZIA term PBR-DIRECT-INTERNET then routing-instance Internet-Bypass-ZIA
set firewall family inet filter PBR-BYPASS-ZSCALER-ZIA term term-999 then accept
!
set policy-options prefix-list PFX_FROM_Prod_TO_Internet-Bypass-ZIA 10.99.99.0/30
set policy-options prefix-list PFX_FROM_Prod_TO_Internet-Bypass-ZIA 10.0.0.0/8
set policy-options policy-statement POL_EXPORT_FROM_Prod_TO_Internet-Bypass-ZIA term 10 from instance Prod
set policy-options policy-statement POL_EXPORT_FROM_Prod_TO_Internet-Bypass-ZIA term 10 from prefix-list PFX_FROM_Prod_TO_Internet-Bypass-ZIA
set policy-options policy-statement POL_EXPORT_FROM_Prod_TO_Internet-Bypass-ZIA term 10 then accept
set policy-options policy-statement POL_EXPORT_FROM_Prod_TO_Internet-Bypass-ZIA term 999 from instance Prod
set policy-options policy-statement POL_EXPORT_FROM_Prod_TO_Internet-Bypass-ZIA term 999 then reject
!
set policy-options prefix-list PFX_FROM_Internet_TO_Internet-Bypass-ZIA 203.0.113.0/30
set policy-options policy-statement POL_EXPORT_FROM_Internet_TO_Internet-Bypass-ZIA term 10 from instance Internet
set policy-options policy-statement POL_EXPORT_FROM_Internet_TO_Internet-Bypass-ZIA term 10 from prefix-list PFX_FROM_Internet_TO_Internet-Bypass-ZIA
set policy-options policy-statement POL_EXPORT_FROM_Internet_TO_Internet-Bypass-ZIA term 10 then accept
set policy-options policy-statement POL_EXPORT_FROM_Internet_TO_Internet-Bypass-ZIA term 999 from instance Internet
set policy-options policy-statement POL_EXPORT_FROM_Internet_TO_Internet-Bypass-ZIA term 999 then reject
!
set interfaces xe-0/0/1 unit 10 family inet filter input PBR-BYPASS-ZSCALER-ZIA
```

## Break it down now y'all
That's quite a chunk to digest, so let's break it into chunks of what it achieves, using each exclamation mark (!) as a section divider:

1. Create a new VRF `Internet-Bypass-ZIA` for the PBR to occur within; map the Internet-facing WAN and Prod-facing LAN Interfaces and next-hop Prefixes into it, and set a Static Default Route out of it via the Internet-facing WAN interface
2. Define a FBF/PBR policy called `PBR-BYPASS-ZSCALER-ZIA` which has one term/policy statement called `PBR-DIRECT-INTERNET` that matches `HTTPS` requests from only the `"Direct Internet access"` Subnet `10.2.0.0/24`, and bypasses (does not PBR) any other flows (i.e. leaves them as-was to flow via Zscaler Internet as if the PBR configuration didn't exist)
3. Create a Routing Policy `POL_EXPORT_FROM_Prod_TO_Internet-Bypass-ZIA` to inter-VRF the LAN-facing `10.99.99.0/30` Handoff/Linknet and associated next-hop `10.0.0.0/8` Route from the `Prod` VRF into the PBR `Internet-Bypass-ZIA` VRF
4. Create a Routing Policy `POL_EXPORT_FROM_Internet_TO_Internet-Bypass-ZIA` to inter-VRF the WAN-facing `203.0.113.0/30` Handoff/Linknet from the `Internet` VRF into the PBR `Internet-Bypass-ZIA` VRF
5. Tie it all together by applying the FBF/PBR policy `PBR-BYPASS-ZSCALER-ZIA` to ingress LAN-facing interface `xe-0/0/1.10`
 1. Note if we changed the FBF/PBR policy `PBR-BYPASS-ZSCALER-ZIA` `term-999` line from `"...then accept"` to `"...then reject"` - or just did not have that line - then any non-PBR'd traffic would not just not be PBR'd, it'd be dropped entirely - so be **very careful** that the PBR/FBF policy is 100% correct _before_ you apply it to the ingress interface

## One hop this time
Hopefully this has been a useful jaunt through the differences Junos SRX uses to perform what we Cisco folk would know as PBR, and shows how it works in practice, effectively using a "third" VRF - in our example - which acts as a PBR Container to glue it all together. In practice this is nice as it keeps it obvious which flows/Source IPs/Destination IPs are being PBR'd and which aren't, however it can be confusing to wrap your head around. I also found a few gotchas if you forget/mismatch the Linknets to "import" the WAN/LAN interfaces into what is effectively a "foreign VRF" from their respective "Prod" or "Internet" native VRFs.

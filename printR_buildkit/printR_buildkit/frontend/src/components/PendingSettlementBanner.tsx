import React from "react";
import { Badge } from "./Badge";

export function PendingSettlementBanner({ provider, requestId }:{
  provider: "SIM" | "ONCHAIN";
  requestId: string;
}){
  return (
    <div style={{
      marginTop: 10,
      padding: "10px 12px",
      borderRadius: 16,
      border: "1px solid rgba(34,211,238,0.22)",
      background: "rgba(34,211,238,0.06)",
      display:"flex",
      justifyContent:"space-between",
      alignItems:"center",
      gap: 10
    }}>
      <div style={{minWidth:0}}>
        <div style={{fontSize:12, opacity:0.85, textTransform:"uppercase", letterSpacing:1.0}}>Settlement Pending</div>
        <div style={{fontSize:12, opacity:0.85, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>
          {provider === "ONCHAIN" ? "On-chain VRF request" : "Simulated VRF request"} • {requestId}
        </div>
      </div>
      <Badge text={provider} tone={provider === "ONCHAIN" ? "purple" : "teal"} />
    </div>
  );
}

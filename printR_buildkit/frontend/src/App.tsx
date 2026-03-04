import React from "react";
import RouterApp from "./RouterApp";
import { WalletGate } from "./printr2/wallet/WalletGate";

export default function App(){
  return (
    <WalletGate>
      <RouterApp />
    </WalletGate>
  );
}

import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { BootSplash } from "./printr2/BootSplash";

function Root(){
  const [splash, setSplash] = useState(true);
  return (
    <>
      {splash ? <BootSplash onDone={() => setSplash(false)} /> : null}
      <App />
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);

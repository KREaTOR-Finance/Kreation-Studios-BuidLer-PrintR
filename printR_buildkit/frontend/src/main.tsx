import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import RouterApp from "./RouterApp";
import { SplashScreen } from "./components/SplashScreen";
import "./styles/tokens.css";
import "./styles/app.css";

function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      <RouterApp />
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { GRNProvider } from "./context/GRNContext.jsx";
import "./styles/workflow.css";

createRoot(document.getElementById("root")).render(<React.StrictMode><AuthProvider><GRNProvider><App /></GRNProvider></AuthProvider></React.StrictMode>);

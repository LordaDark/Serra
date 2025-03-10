import React from "react";
import { createRoot } from "react-dom/client"; // Cambiato rispetto a React 17
import App from "./App";

const root = createRoot(document.getElementById("root"));
root.render(<App />);

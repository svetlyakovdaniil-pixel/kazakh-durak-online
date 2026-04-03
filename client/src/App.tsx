import React from 'react';
import { Toaster } from "./components/ui/sonner";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";

import Home from "./pages/Home";
import GameRoom from "./pages/GameRoom";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <ErrorBoundary>
      <Toaster />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/room/:roomId" component={GameRoom} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </ErrorBoundary>
  );
}

export default App;

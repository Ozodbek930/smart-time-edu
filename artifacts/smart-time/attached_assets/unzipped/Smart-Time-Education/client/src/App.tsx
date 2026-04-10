import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import Speaking from "@/pages/speaking";
import Listening from "@/pages/listening";
import Reading from "@/pages/reading";
import Writing from "@/pages/writing";
import Register from "@/pages/register";
import Login from "@/pages/login";
import Admin from "@/pages/admin";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/speaking" component={Speaking} />
      <Route path="/listening" component={Listening} />
      <Route path="/reading" component={Reading} />
      <Route path="/writing" component={Writing} />
      <Route path="/register" component={Register} />
      <Route path="/login" component={Login} />
      <Route path="/admin" component={Admin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <I18nProvider>
          <Toaster />
          <Router />
        </I18nProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

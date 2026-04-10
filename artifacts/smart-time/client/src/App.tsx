import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import { FloatingNotebook } from "@/components/floating-notebook";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import Speaking from "@/pages/speaking";
import Listening from "@/pages/listening";
import Reading from "@/pages/reading";
import Writing from "@/pages/writing";
import FullMock from "@/pages/fullmock";
import FullMockTake, { FullMockSection } from "@/pages/fullmock-take";
import Register from "@/pages/register";
import Login from "@/pages/login";
import Admin from "@/pages/admin";
import AdminMockBuilder from "@/pages/admin-mock-builder";
import OnlineLessons from "@/pages/online-lessons";
import OnlineLessonPage from "@/pages/online-lesson";
import type { User } from "@shared/schema";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/speaking" component={Speaking} />
      <Route path="/listening" component={Listening} />
      <Route path="/reading" component={Reading} />
      <Route path="/writing" component={Writing} />
      <Route path="/fullmock" component={FullMock} />
      <Route path="/fullmock/:id/section/:step" component={FullMockSection} />
      <Route path="/fullmock/:id" component={FullMockTake} />
      <Route path="/register" component={Register} />
      <Route path="/login" component={Login} />
      <Route path="/admin" component={Admin} />
      <Route path="/admin/mock-builder" component={AdminMockBuilder} />
      <Route path="/admin/mock-builder/:id" component={AdminMockBuilder} />
      <Route path="/online-lessons" component={OnlineLessons} />
      <Route path="/online-lesson/:id" component={OnlineLessonPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppInner() {
  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  return (
    <>
      <Toaster />
      <Router />
      {user && !user.isAdmin && <FloatingNotebook />}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <I18nProvider>
          <AppInner />
        </I18nProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

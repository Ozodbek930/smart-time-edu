import { useI18n } from "@/lib/i18n";
import logoImg from "@assets/image_1772783424448.jpg";
import { Mic, Headphones, BookOpen, PenTool, Trophy } from "lucide-react";
import { Link } from "wouter";

export function Footer() {
  const { t } = useI18n();

  return (
    <footer className="border-t border-border/60 bg-card/40" data-testid="footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">

          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <img
                src={logoImg}
                alt="Smart Time Education"
                className="h-10 w-10 object-cover rounded-xl shadow-sm"
              />
              <div>
                <div className="font-black text-sm tracking-wide">SMART TIME</div>
                <div className="text-xs text-muted-foreground font-medium">EDUCATION</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              {t.footer.description}
            </p>
            <div className="flex items-center gap-2 pt-1">
              {[
                { icon: Mic, href: "/speaking" },
                { icon: Headphones, href: "/listening" },
                { icon: BookOpen, href: "/reading" },
                { icon: PenTool, href: "/writing" },
                { icon: Trophy, href: "/fullmock" },
              ].map(({ icon: Icon, href }) => (
                <Link key={href} href={href}>
                  <div className="w-8 h-8 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary flex items-center justify-center text-muted-foreground transition-colors duration-200 cursor-pointer">
                    <Icon className="w-4 h-4" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-sm">{t.footer.practiceTests}</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li className="hover:text-foreground transition-colors cursor-pointer">IELTS Speaking Part 1</li>
              <li className="hover:text-foreground transition-colors cursor-pointer">IELTS Speaking Part 2</li>
              <li className="hover:text-foreground transition-colors cursor-pointer">IELTS Speaking Part 3</li>
              <li className="hover:text-foreground transition-colors cursor-pointer">IELTS Listening Sections</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-sm">{t.footer.resources}</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li className="hover:text-foreground transition-colors cursor-pointer">{t.footer.tipsStrategies}</li>
              <li className="hover:text-foreground transition-colors cursor-pointer">{t.footer.bandGuide}</li>
              <li className="hover:text-foreground transition-colors cursor-pointer">{t.footer.vocabulary}</li>
              <li className="hover:text-foreground transition-colors cursor-pointer">{t.footer.grammar}</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border/60 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>&copy; {new Date().getFullYear()} SMART TIME EDUCATION. {t.footer.rights}</span>
          <span className="opacity-60">Powered by Gemini AI</span>
        </div>
      </div>
    </footer>
  );
}

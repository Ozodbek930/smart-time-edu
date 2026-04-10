import { BookOpen } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function Footer() {
  const { t } = useI18n();

  return (
    <footer className="border-t bg-card" data-testid="footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-bold text-sm">SMART TIME</span>
                <span className="text-xs text-muted-foreground tracking-widest">EDUCATION</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs">
              {t.footer.description}
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-sm">{t.footer.practiceTests}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>IELTS Speaking Part 1</li>
              <li>IELTS Speaking Part 2</li>
              <li>IELTS Speaking Part 3</li>
              <li>IELTS Listening Sections</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-sm">{t.footer.resources}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>{t.footer.tipsStrategies}</li>
              <li>{t.footer.bandGuide}</li>
              <li>{t.footer.vocabulary}</li>
              <li>{t.footer.grammar}</li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-8 pt-6 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} SMART TIME EDUCATION. {t.footer.rights}
        </div>
      </div>
    </footer>
  );
}

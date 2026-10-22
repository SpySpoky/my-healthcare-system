import { t } from "../../i18n";
function Card({ title, children, as: Element = "div", ...rest }) {
  return (
    <Element
      {...rest}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:shadow-lg">
      {title && (
        <div className="border-b border-slate-100 bg-gradient-to-r from-accent-50 to-accent2-50 px-5 py-4">
          <h3 className="text-lg font-bold text-slate-900">
            {t(title)}
          </h3>
        </div>
      )}

      <div className="p-5">
        {children}
      </div>
    </Element>
  );
}

export default Card;
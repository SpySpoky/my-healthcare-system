import { useState } from "react";

import { t } from "../../i18n";
function Tabs({ tabs, activeTab: controlledActiveTab = null }) {
  const isValidTab = (index) =>
    index !== null && index >= 0 && index < tabs.length;

  const [activeTab, setActiveTab] = useState(
    isValidTab(controlledActiveTab) ? controlledActiveTab : 0
  );
  const [previousControlledTab, setPreviousControlledTab] =
    useState(controlledActiveTab);

  // Follow the parent's requested tab when it changes,
  // while still allowing the user to switch tabs freely.
  if (controlledActiveTab !== previousControlledTab) {
    setPreviousControlledTab(controlledActiveTab);

    if (isValidTab(controlledActiveTab)) {
      setActiveTab(controlledActiveTab);
    }
  }

  return (
    <div className="w-full">

      {/* Tabs Header */}

      <div className="mb-6 flex w-full overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-1.5 shadow-sm scrollbar-thin">

        <div className="flex min-w-max gap-1">

          {tabs.map((tab, index) => (
            <button
              key={tab.label}
              type="button"
              className={`
                relative
                rounded-xl
                px-4
                py-2.5
                text-sm
                font-semibold
                whitespace-nowrap
                transition-all
                duration-200
                ${
                  activeTab === index
                    ? "bg-gradient-to-r from-accent-500 to-accent2-500 text-white shadow-md shadow-accent-500/20"
                    : "text-slate-500 hover:bg-white hover:text-accent-700 hover:shadow-sm"
                }
              `}
              onClick={() => setActiveTab(index)}
            >
              {t(tab.label)}
            </button>
          ))}

        </div>

      </div>


      {/* Tab Content */}

      <div className="min-w-0">
        {tabs[activeTab]?.content}
      </div>

    </div>
  );
}

export default Tabs;
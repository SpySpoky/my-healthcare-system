import { Link, useLocation } from "react-router-dom";

import { t } from "../../i18n";
const segmentLabels = {
  patient: t("Patient"),
  messages: t("Messages"),
  doctor: t("Doctor"),
  admin: t("Admin"),
  dashboard: t("Dashboard"),
  appointments: t("Appointments"),
  book: t("Book"),
  reschedule: t("Reschedule"),
  "medical-records": t("Medical Records"),
  feedback: t("Feedback"),
  profile: t("Profile"),
  availability: t("Availability"),
  patients: t("Patients"),
  diagnosis: t("Add Diagnosis"),
  prescription: t("Prescription"),
  status: t("Status"),
  users: t("Users"),
  applications: t("Applications"),
  reports: t("Reports"),
  activity: t("Activity"),
};

// Intermediate paths that have no page of their own.
const NON_ROUTABLE_PATHS = [/^\/patient\/appointments\/[^/]+$/];

const formatSegment = (segment) =>
  segmentLabels[segment] ||
  (/^\d+$/.test(segment) ? `#${segment}` : segment);

function Breadcrumbs() {
  const { pathname } = useLocation();
  const segments = pathname.split("/").filter(Boolean);

  // The role segment has no page of its own, so the role
  // crumb links to that role's dashboard.
  const [role, ...rest] = segments;

  const crumbs = [
    {
      label: formatSegment(role),
      path: `/${role}/dashboard`,
      isLinkable: true,
    },
    ...rest
      .map((segment, index) => {
        const path = `/${segments.slice(0, index + 2).join("/")}`;

        return {
          segment,
          label: formatSegment(segment),
          path,
          isLinkable: !NON_ROUTABLE_PATHS.some((pattern) =>
            pattern.test(path)
          ),
        };
      })
      .filter((crumb) => crumb.segment !== "dashboard"),
  ];

  if (!role || crumbs.length < 2) {
    return null;
  }

  return (
    <nav
      aria-label={t("Breadcrumb")}
      className="mb-4 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-400"
    >
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;

        return (
          <span
            key={crumb.path}
            className="flex items-center gap-1.5"
          >
            {isLast || !crumb.isLinkable ? (
              <span
                aria-current={isLast ? "page" : undefined}
                className={isLast ? "text-slate-600" : undefined}
              >
                {t(crumb.label)}
              </span>
            ) : (
              <Link
                to={crumb.path}
                className="transition-colors hover:text-slate-700"
              >
                {t(crumb.label)}
              </Link>
            )}

            {!isLast && <span aria-hidden="true">/</span>}
          </span>
        );
      })}
    </nav>
  );
}

export default Breadcrumbs;

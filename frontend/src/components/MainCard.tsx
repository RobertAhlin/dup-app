import CourseSidebar from "./CourseSidebar";

interface MainCardProps {
  name: string;
  email: string;
  role: string;
}

export default function MainCard({ name, role }: MainCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-2xl w-[98vw] h-[80vw] mx-auto overflow-hidden font-sans">
      <div className="bg-linear-to-br from-[#01105a] to-[#313135] m-3 md:p-8 p-3 text-white rounded-xl">
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap md:flex-nowrap items-center gap-2 md:gap-3">
            <h1 className="inline m-0 text-2xl font-bold text-white leading-tight">
              Welcome, {name}
            </h1>
            <span className="text-white/90">Role:</span>
            <span className="bg-white/20 py-1 px-3 rounded-full text-sm capitalize backdrop-blur-md">
              {role}
            </span>
          </div>
        </div>
      </div>
      <div className="p-4 md:p-4 min-h-[200px] grid grid-cols-[auto_1fr] gap-4">
        <CourseSidebar />
        <div className="bg-white rounded-xl border border-dashed border-black/10">
          {/* Placeholder for main dashboard content */}
        </div>
      </div>
    </div>
  );
}

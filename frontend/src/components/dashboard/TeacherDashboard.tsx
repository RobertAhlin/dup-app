import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import ActivityLog from "./ActivityLog";
import { getCourseMembers } from "../../api/courseMembers";
import type { CourseMember } from "../../types/courseMember";

type TeacherCourseStats = {
  id: number
  title: string
  icon?: string
  stats: {
    totalStudents: number
    totalTasks: number
    totalHubs: number
    totalItems: number
    totalCompletedItems: number
    averagePercentage: number
  }
}

type Props = {
  courses: TeacherCourseStats[]
}

const colors = [
  '#e91e63', // pink
  '#00bcd4', // cyan
  '#4caf50', // green
  '#ff9800', // orange
  '#9c27b0', // purple
  '#f44336', // red
  '#2196f3', // blue
  '#ffeb3b', // yellow
];

export default function TeacherDashboard({ courses }: Props) {
  const navigate = useNavigate();
  const sortedCourses = [...courses].sort((a, b) => b.stats.averagePercentage - a.stats.averagePercentage);
  
  const [selectedCourse, setSelectedCourse] = useState<TeacherCourseStats | null>(null);
  const [courseMembers, setCourseMembers] = useState<CourseMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    if (selectedCourse) {
      loadCourseMembers(selectedCourse.id);
    }
  }, [selectedCourse]);

  const loadCourseMembers = async (courseId: number) => {
    setLoadingMembers(true);
    try {
      const members = await getCourseMembers(courseId, {});
      setCourseMembers(members);
    } catch (err) {
      console.error('Failed to load course members:', err);
      setCourseMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  const formatLastLogin = (lastLogin?: string) => {
    if (!lastLogin) return 'Never';
    
    const date = new Date(lastLogin);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / 3600000;
    
    if (diffHours < 24) return 'Within 24h';
    if (diffHours < 168) return 'Last week'; // 7 days
    return 'Inactive';
  };

  const getLoginStatusColor = (lastLogin?: string) => {
    if (!lastLogin) return 'bg-gray-400';
    
    const diffMs = new Date().getTime() - new Date(lastLogin).getTime();
    const diffHours = diffMs / 3600000;
    
    if (diffHours < 24) return 'bg-green-500';
    if (diffHours < 168) return 'bg-yellow-500'; // 7 days
    return 'bg-red-500';
  };

  const handleCourseClick = (course: TeacherCourseStats) => {
    setSelectedCourse(course);
  };

  const students = courseMembers.filter(m => m.role_in_course === 'student');
  const teachers = courseMembers.filter(m => m.role_in_course === 'teacher');

  return (
    <div>
      <div className="flex justify-between gap-2 w-full min-w-0">
        {/* Course list */}
        <div className="border rounded-md border-slate-200 p-2">
            <h2 className="text-sm font-bold text-slate-800 mb-3">Course Completion Overview</h2>
          {courses.length === 0 ? (
            <div>
              <p className="text-slate-600">You are not assigned to any courses yet.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {sortedCourses.map((course, index) => (
                <div
                  key={course.id}
                  className={`flex flex-col px-2 rounded-lg border transition-all ${
                    selectedCourse?.id === course.id 
                      ? 'border-blue-500 bg-blue-50 shadow-md' 
                      : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                  } cursor-pointer`}
                  onClick={() => handleCourseClick(course)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <p className="text-base font-semibold text-slate-800 truncate">{course.title}</p>
                    </div>
                    <div className="text-right ml-2">
                      <p className="text-1xl font-bold text-slate-800">{course.stats.averagePercentage}%</p>
                    </div>
                  </div>
                  
                  <p className="text-xs text-slate-500">
                    {course.stats.totalStudents} {course.stats.totalStudents === 1 ? 'student' : 'students'} • {course.stats.totalItems} items
                  </p>
                  
                  {/* Progress bar */}
                  <div className="w-full mb-2 bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${course.stats.averagePercentage}%`,
                        backgroundColor: colors[index % colors.length]
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="shrink min-w-0 w-full border rounded-md border-slate-200 p-4 overflow-auto" style={{ maxHeight: 'calc(100vh - 120px)' }}>
          {!selectedCourse ? (
            <div className="flex items-center justify-center h-full text-slate-500">
              <p>Select a course to view details</p>
            </div>
          ) : (
            <div>
              <div className="mb-4 pb-3 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-800">{selectedCourse.title}</h2>
                <p className="text-sm text-slate-600">
                  {students.length} {students.length === 1 ? 'student' : 'students'} • {teachers.length} {teachers.length === 1 ? 'teacher' : 'teachers'}
                </p>
              </div>

              {loadingMembers ? (
                <p className="text-slate-500">Loading members...</p>
              ) : (
                <div className="space-y-6">
                  {/* Teachers Section */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-slate-700">Teachers ({teachers.length})</h3>
                      <h3 className="text-sm font-semibold text-slate-700">Login Status</h3>
                    </div>
                    {teachers.length === 0 ? (
                      <p className="text-sm text-slate-500">No teachers assigned</p>
                    ) : (
                      <div className="space-y-2">
                        {teachers.map(teacher => (
                          <div key={teacher.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-slate-800 truncate">{teacher.name}</p>
                                <p className="text-xs text-slate-500 truncate">{teacher.email}</p>
                              </div>
                            </div>
                            <div className="text-right ml-2">
                              <p className="text-xs text-slate-600">{formatLastLogin(teacher.last_login_at)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Students Section */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-slate-700">Students ({students.length})</h3>
                      <div className="flex gap-8">
                        <h3 className="text-sm font-semibold text-slate-700">Progress</h3>
                        <h3 className="text-sm font-semibold text-slate-700">Login Status</h3>
                      </div>
                    </div>
                    {students.length === 0 ? (
                      <p className="text-sm text-slate-500">No students enrolled</p>
                    ) : (
                      <div className="space-y-2">
                        {students.map(student => {
                          const progressPercent = student.total_tasks && student.total_tasks > 0 
                            ? Math.round((student.completed_tasks || 0) / student.total_tasks * 100) 
                            : 0;
                          
                          return (
                            <div key={student.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-slate-800 truncate">{student.name}</p>
                                  <p className="text-xs text-slate-500 truncate">{student.email}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4 ml-2">
                                <div className="flex flex-col items-end" style={{ width: '120px' }}>
                                  <div className="w-full bg-slate-200 rounded-full h-2 mb-1">
                                    <div 
                                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                      style={{ width: `${progressPercent}%` }}
                                    />
                                  </div>
                                  <p className="text-xs text-slate-600">{progressPercent}% ({student.completed_tasks || 0}/{student.total_tasks || 0})</p>
                                </div>
                                <div className="text-right" style={{ width: '80px' }}>
                                  <p className="text-xs text-slate-600">{formatLastLogin(student.last_login_at)}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        {/* Activity Log */}
        <div className="w-60 shrink-0 border rounded-md  border-slate-200 p-2">
          <ActivityLog limit={10} />
        </div>
      </div>
    </div>
  );
}

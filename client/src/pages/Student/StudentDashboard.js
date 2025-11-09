import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, addDoc, getDoc, doc, updateDoc } from 'firebase/firestore';
import JobApplicationForm from '../../components/jobs/JobApplicationForm';
import CourseApplicationForm from '../../components/forms/CourseApplicationForm';
import './StudentDashboard.css';

const StudentDashboard = () => {
  const { user, userData } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [applications, setApplications] = useState([]);
  const [courses, setCourses] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showJobApplication, setShowJobApplication] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showCourseApplication, setShowCourseApplication] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStudentData();
    }
  }, [user]);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchStudentApplications(),
        fetchCourses(),
        fetchInstitutions(),
        fetchJobs()
      ]);
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentApplications = async () => {
    const q = query(collection(db, 'applications'), where('studentId', '==', user.uid));
    const querySnapshot = await getDocs(q);
    const applicationsList = await Promise.all(
      querySnapshot.docs.map(async (docSnap) => {
        const appData = docSnap.data();
        
        // Fetch course and institution details
        const [courseDoc, institutionDoc] = await Promise.all([
          getDoc(doc(db, 'courses', appData.courseId)),
          getDoc(doc(db, 'institutions', appData.institutionId))
        ]);
        
        return {
          id: docSnap.id,
          ...appData,
          course: courseDoc.exists() ? courseDoc.data() : {},
          institution: institutionDoc.exists() ? institutionDoc.data() : {}
        };
      })
    );
    setApplications(applicationsList);
  };

  const fetchCourses = async () => {
    const querySnapshot = await getDocs(collection(db, 'courses'));
    const coursesList = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setCourses(coursesList);
  };

  const fetchInstitutions = async () => {
    const querySnapshot = await getDocs(collection(db, 'institutions'));
    const institutionsList = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setInstitutions(institutionsList);
  };

  const fetchJobs = async () => {
    const q = query(collection(db, 'jobs'), where('status', '==', 'active'));
    const querySnapshot = await getDocs(q);
    const jobsList = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setJobs(jobsList);
  };

  const handleCourseApply = (course) => {
    setSelectedCourse(course);
    setShowCourseApplication(true);
  };

  const handleCourseApplicationSuccess = () => {
    setShowCourseApplication(false);
    setSelectedCourse(null);
    fetchStudentApplications(); // Refresh applications list
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <StudentOverview applications={applications} jobs={jobs} />;
      case 'applications':
        return <StudentApplications applications={applications} />;
      case 'courses':
        return <BrowseCourses 
          courses={courses} 
          institutions={institutions}
          onCourseApply={handleCourseApply}
        />;
      case 'jobs':
        return <BrowseJobs 
          jobs={jobs} 
          onJobApply={(job) => {
            setSelectedJob(job);
            setShowJobApplication(true);
          }}
        />;
      case 'profile':
        return <StudentProfile 
          studentData={userData} 
          onProfileUpdate={fetchStudentData}
        />;
      default:
        return <StudentOverview applications={applications} jobs={jobs} />;
    }
  };

  if (loading) {
    return (
      <div className="student-dashboard">
        <div className="loading">Loading your dashboard...</div>
      </div>
    );
  }

  return (
    <div className="student-dashboard">
      <div className="dashboard-header">
        <h1>Student Dashboard</h1>
        <p>Welcome back, {userData?.name || user?.email}</p>
        <p>Role: <span className="user-role">{userData?.role}</span></p>
      </div>

      {/* Navbar instead of sidebar */}
      <nav className="student-navbar">
        <ul>
          <li>
            <button 
              className={activeTab === 'overview' ? 'active' : ''}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
          </li>
          <li>
            <button 
              className={activeTab === 'applications' ? 'active' : ''}
              onClick={() => setActiveTab('applications')}
            >
              My Applications
            </button>
          </li>
          <li>
            <button 
              className={activeTab === 'courses' ? 'active' : ''}
              onClick={() => setActiveTab('courses')}
            >
              Browse Courses
            </button>
          </li>
          <li>
            <button 
              className={activeTab === 'jobs' ? 'active' : ''}
              onClick={() => setActiveTab('jobs')}
            >
              Find Jobs
            </button>
          </li>
          <li>
            <button 
              className={activeTab === 'profile' ? 'active' : ''}
              onClick={() => setActiveTab('profile')}
            >
              My Profile
            </button>
          </li>
        </ul>
      </nav>

      <main className="student-content">
        {renderTabContent()}
      </main>

      {/* Course Application Modal - Only shows when a course is selected */}
      {showCourseApplication && selectedCourse && (
        <CourseApplicationForm 
          course={selectedCourse}
          onClose={() => {
            setShowCourseApplication(false);
            setSelectedCourse(null);
          }}
          onSuccess={handleCourseApplicationSuccess}
        />
      )}

      {showJobApplication && selectedJob && (
        <JobApplicationForm
          job={selectedJob}
          onClose={() => {
            setShowJobApplication(false);
            setSelectedJob(null);
          }}
          onSuccess={() => {
            setShowJobApplication(false);
            setSelectedJob(null);
            alert('Application submitted successfully!');
            fetchStudentData();
          }}
          studentId={user.uid}
          studentData={userData}
        />
      )}
    </div>
  );
};

// Sub-components for Student Dashboard
const StudentOverview = ({ applications, jobs }) => {
  const stats = {
    totalApplications: applications.length,
    pendingApplications: applications.filter(app => app.status === 'pending').length,
    admittedApplications: applications.filter(app => app.status === 'admitted').length,
    availableJobs: jobs.length,
  };

  return (
    <div className="student-overview">
      <h2>Student Overview</h2>
      
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Applications</h3>
          <p className="stat-number">{stats.totalApplications}</p>
          <small>All course applications</small>
        </div>
        
        <div className="stat-card">
          <h3>Pending</h3>
          <p className="stat-number">{stats.pendingApplications}</p>
          <small>Under review</small>
        </div>
        
        <div className="stat-card">
          <h3>Admitted</h3>
          <p className="stat-number">{stats.admittedApplications}</p>
          <small>Accepted offers</small>
        </div>
        
        <div className="stat-card">
          <h3>Available Jobs</h3>
          <p className="stat-number">{stats.availableJobs}</p>
          <small>Job opportunities</small>
        </div>
      </div>

      <div className="recent-applications">
        <h3>Recent Applications</h3>
        <div className="applications-preview">
          {applications.slice(0, 3).map(application => (
            <div key={application.id} className="application-preview">
              <h4>{application.course?.name || 'Unknown Course'}</h4>
              <p>{application.institution?.name || 'Unknown Institution'}</p>
              <span className={`status status-${application.status}`}>
                {application.status}
              </span>
            </div>
          ))}
          {applications.length === 0 && (
            <div className="empty-state">No applications yet</div>
          )}
        </div>
      </div>
    </div>
  );
};

const StudentApplications = ({ applications }) => {
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      if (timestamp.toDate) {
        return timestamp.toDate().toLocaleDateString();
      }
      return new Date(timestamp).toLocaleDateString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  return (
    <div className="student-applications">
      <h2>My Course Applications</h2>
      
      <div className="applications-list">
        {applications.map(application => (
          <div key={application.id} className="application-card">
            <div className="application-header">
              <div>
                <h3>{application.course?.name || 'Unknown Course'}</h3>
                <p>{application.institution?.name || 'Unknown Institution'}</p>
              </div>
              <span className={`status status-${application.status}`}>
                {application.status}
              </span>
            </div>
            
            <div className="application-details">
              <div className="detail-item">
                <strong>Course Duration:</strong>
                <span>{application.course?.duration || 'N/A'} years</span>
              </div>
              <div className="detail-item">
                <strong>Faculty:</strong>
                <span>{application.course?.facultyName || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <strong>Applied Date:</strong>
                <span>{formatDate(application.appliedAt)}</span>
              </div>
              {application.reviewedAt && (
                <div className="detail-item">
                  <strong>Reviewed Date:</strong>
                  <span>{formatDate(application.reviewedAt)}</span>
                </div>
              )}
            </div>
            
            {application.status === 'admitted' && (
              <div className="admission-offer">
                <p> Congratulations! You have been admitted to this program.</p>
              </div>
            )}
          </div>
        ))}
        
        {applications.length === 0 && (
          <div className="empty-state">
            <p>You haven't submitted any course applications yet.</p>
            <p>Browse courses and apply to get started with your academic journey!</p>
          </div>
        )}
      </div>
    </div>
  );
};

const BrowseCourses = ({ courses, institutions, onCourseApply }) => {
  const [selectedInstitution, setSelectedInstitution] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('');

  const filteredCourses = courses.filter(course => {
    if (selectedInstitution && course.institutionId !== selectedInstitution) return false;
    if (selectedFaculty && course.facultyName !== selectedFaculty) return false;
    return true;
  });

  const faculties = [...new Set(courses.map(course => course.facultyName).filter(Boolean))];

  return (
    <div className="browse-courses">
      <div className="section-header">
        <h2>Browse Courses</h2>
        <p className="section-description">
          Explore available courses from various institutions. Click "Apply for this Course" to submit your application.
        </p>
      </div>

      <div className="filters">
        <div className="filter-group">
          <label>Filter by Institution:</label>
          <select 
            value={selectedInstitution} 
            onChange={(e) => setSelectedInstitution(e.target.value)}
          >
            <option value="">All Institutions</option>
            {institutions.map(inst => (
              <option key={inst.id} value={inst.id}>{inst.name}</option>
            ))}
          </select>
        </div>
        
        <div className="filter-group">
          <label>Filter by Faculty:</label>
          <select 
            value={selectedFaculty} 
            onChange={(e) => setSelectedFaculty(e.target.value)}
          >
            <option value="">All Faculties</option>
            {faculties.map(faculty => (
              <option key={faculty} value={faculty}>{faculty}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="courses-grid">
        {filteredCourses.map(course => {
          const institution = institutions.find(inst => inst.id === course.institutionId);
          return (
            <div key={course.id} className="course-card">
              <div className="course-header">
                <h3>{course.name}</h3>
                <span className="course-code">{course.code}</span>
              </div>
              
              <div className="course-details">
                <p><strong>Institution:</strong> {institution?.name || 'Unknown'}</p>
                <p><strong>Faculty:</strong> {course.facultyName}</p>
                <p><strong>Duration:</strong> {course.duration} years</p>
                <p><strong>Fees:</strong> M{course.fees || 'N/A'}</p>
                <p><strong>Capacity:</strong> {course.capacity} students</p>
              </div>
              
              <div className="course-description">
                <p>{course.description || 'No description available.'}</p>
              </div>
              
              <div className="course-requirements">
                <h4>Requirements:</h4>
                <p>{course.requirements || 'No specific requirements listed.'}</p>
              </div>
              
              <button 
                className="btn-primary" 
                onClick={() => onCourseApply(course)}
              >
                Apply for this Course
              </button>
            </div>
          );
        })}
        
        {filteredCourses.length === 0 && (
          <div className="empty-state">
            <p>No courses found matching your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const BrowseJobs = ({ jobs, onJobApply }) => {
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      if (timestamp.toDate) {
        return timestamp.toDate().toLocaleDateString();
      }
      return new Date(timestamp).toLocaleDateString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  return (
    <div className="browse-jobs">
      <h2>Available Job Opportunities</h2>
      
      <div className="jobs-grid">
        {jobs.map(job => (
          <div key={job.id} className="job-card">
            <div className="job-header">
              <h3>{job.title}</h3>
              <span className="job-type">{job.type}</span>
            </div>
            
            <div className="job-details">
              <p><strong>Company:</strong> {job.companyName}</p>
              <p><strong>Department:</strong> {job.department}</p>
              <p><strong>Location:</strong> {job.location}</p>
              <p><strong>Salary:</strong> {job.salary}</p>
              <p><strong>Posted:</strong> {formatDate(job.createdAt)}</p>
            </div>
            
            <div className="job-description">
              <p>{job.description}</p>
            </div>
            
            <div className="job-requirements">
              <h4>Requirements:</h4>
              <p>{job.requirements}</p>
            </div>
            
            <div className="job-actions">
              <button 
                className="btn-primary" 
                onClick={() => onJobApply(job)}
              >
                Apply Now
              </button>
            </div>
          </div>
        ))}
        
        {jobs.length === 0 && (
          <div className="empty-state">
            <p>No job opportunities available at the moment.</p>
            <p>Check back later for new job postings.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const StudentProfile = ({ studentData, onProfileUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    highSchool: '',
    graduationYear: '',
    address: '',
    dateOfBirth: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (studentData) {
      setFormData({
        name: studentData.name || '',
        phone: studentData.phone || '',
        highSchool: studentData.highSchool || '',
        graduationYear: studentData.graduationYear || '',
        address: studentData.address || '',
        dateOfBirth: studentData.dateOfBirth || ''
      });
    }
  }, [studentData]);

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Update the user document in Firestore
      const userDocRef = doc(db, 'users', studentData.uid);
      await updateDoc(userDocRef, {
        ...formData,
        updatedAt: new Date()
      });

      setIsEditing(false);
      alert('Profile updated successfully!');
      onProfileUpdate(); // Refresh the data
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: studentData.name || '',
      phone: studentData.phone || '',
      highSchool: studentData.highSchool || '',
      graduationYear: studentData.graduationYear || '',
      address: studentData.address || '',
      dateOfBirth: studentData.dateOfBirth || ''
    });
    setIsEditing(false);
  };

  return (
    <div className="student-profile">
      <div className="section-header">
        <h2>My Profile</h2>
        <button 
          className={isEditing ? 'btn-secondary' : 'btn-primary'} 
          onClick={isEditing ? handleCancel : handleEditToggle}
        >
          {isEditing ? 'Cancel' : 'Edit Profile'}
        </button>
      </div>
      
      <div className="profile-card">
        {isEditing ? (
          <form onSubmit={handleSubmit}>
            <div className="profile-section">
              <h3>Personal Information</h3>
              <div className="profile-info">
                <div className="form-group">
                  <label>Full Name </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={studentData?.email || ''}
                    disabled
                    className="form-input disabled"
                  />
                  <small>Email cannot be changed</small>
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="+266 XXX XXX"
                  />
                </div>
                <div className="form-group">
                  <label>Date of Birth</label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Address</label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="form-input"
                    rows="3"
                    placeholder="Enter your current address"
                  />
                </div>
              </div>
            </div>
            
            <div className="profile-section">
              <h3>Academic Information</h3>
              <div className="profile-info">
                <div className="form-group">
                  <label>High School</label>
                  <input
                    type="text"
                    name="highSchool"
                    value={formData.highSchool}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Name of your high school"
                  />
                </div>
                <div className="form-group">
                  <label>Graduation Year</label>
                  <input
                    type="number"
                    name="graduationYear"
                    value={formData.graduationYear}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="YYYY"
                    min="1900"
                    max="2030"
                  />
                </div>
              </div>
            </div>
            
            <div className="profile-actions">
              <button 
                type="submit" 
                className="btn-primary" 
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={handleCancel}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="profile-section">
              <h3>Personal Information</h3>
              <div className="profile-info">
                <div className="info-item">
                  <strong>Full Name:</strong>
                  <span>{studentData?.name || 'Not set'}</span>
                </div>
                <div className="info-item">
                  <strong>Email:</strong>
                  <span>{studentData?.email}</span>
                </div>
                <div className="info-item">
                  <strong>Phone:</strong>
                  <span>{studentData?.phone || 'Not provided'}</span>
                </div>
                <div className="info-item">
                  <strong>Date of Birth:</strong>
                  <span>{studentData?.dateOfBirth || 'Not provided'}</span>
                </div>
                <div className="info-item">
                  <strong>Address:</strong>
                  <span>{studentData?.address || 'Not provided'}</span>
                </div>
                <div className="info-item">
                  <strong>Student ID:</strong>
                  <span>{studentData?.uid || 'Not assigned'}</span>
                </div>
              </div>
            </div>
            
            <div className="profile-section">
              <h3>Academic Information</h3>
              <div className="profile-info">
                <div className="info-item">
                  <strong>High School:</strong>
                  <span>{studentData?.highSchool || 'Not specified'}</span>
                </div>
                <div className="info-item">
                  <strong>Graduation Year:</strong>
                  <span>{studentData?.graduationYear || 'Not specified'}</span>
                </div>
              </div>
            </div>
            
            <div className="profile-actions">
              <button className="btn-secondary">Upload Documents</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
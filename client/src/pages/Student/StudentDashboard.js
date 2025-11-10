import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  getDoc, 
  doc, 
  updateDoc, 
  deleteDoc,
  orderBy,
  limit
} from 'firebase/firestore';
import JobApplicationForm from '../../components/jobs/JobApplicationForm';
import CourseApplicationForm from '../../components/forms/CourseApplicationForm';
import AdmissionSelectionModal from '../../components/admissions/AdmissionSelectionModal';
import DocumentUploadModal from '../../components/documents/DocumentUploadModal';
import './StudentDashboard.css';

const StudentDashboard = () => {
  const { user, userData } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [applications, setApplications] = useState([]);
  const [courses, setCourses] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showJobApplication, setShowJobApplication] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showCourseApplication, setShowCourseApplication] = useState(false);
  const [showAdmissionSelection, setShowAdmissionSelection] = useState(false);
  const [admissionOffers, setAdmissionOffers] = useState([]);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [documentType, setDocumentType] = useState('');
  const [loading, setLoading] = useState(true);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (user) {
      fetchStudentData();
      setupRealTimeListeners();
    }
  }, [user]);

  const setupRealTimeListeners = () => {
    // This would typically use onSnapshot for real-time updates
    // For now, we'll refresh data periodically
    const interval = setInterval(() => {
      fetchStudentData();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  };

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchStudentApplications(),
        fetchCourses(),
        fetchInstitutions(),
        fetchJobs(),
        fetchNotifications(),
        fetchDocuments(),
        checkAdmissionOffers()
      ]);
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentApplications = async () => {
    const q = query(
      collection(db, 'applications'), 
      where('studentId', '==', user.uid),
      orderBy('appliedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const applicationsList = await Promise.all(
      querySnapshot.docs.map(async (docSnap) => {
        const appData = docSnap.data();
        
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
    const q = query(collection(db, 'courses'), where('status', '==', 'active'));
    const querySnapshot = await getDocs(q);
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
    const q = query(
      collection(db, 'jobs'), 
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const jobsList = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setJobs(jobsList);
  };

  const fetchNotifications = async () => {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const querySnapshot = await getDocs(q);
    const notificationsList = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    const unreadCount = notificationsList.filter(notif => !notif.read).length;
    setUnreadNotifications(unreadCount);
    setNotifications(notificationsList);
  };

  const fetchDocuments = async () => {
    const q = query(
      collection(db, 'documents'),
      where('studentId', '==', user.uid),
      orderBy('uploadedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const documentsList = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setDocuments(documentsList);
  };

  const checkAdmissionOffers = async () => {
    const admittedApplications = applications.filter(app => app.status === 'admitted');
    const multipleOffers = admittedApplications.length > 1;
    
    if (multipleOffers) {
      setAdmissionOffers(admittedApplications);
      setShowAdmissionSelection(true);
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true,
        readAt: new Date()
      });
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(notif => !notif.read);
      const updatePromises = unreadNotifications.map(notif =>
        updateDoc(doc(db, 'notifications', notif.id), {
          read: true,
          readAt: new Date()
        })
      );
      await Promise.all(updatePromises);
      fetchNotifications();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleCourseApply = async (course) => {
    // Check if student already has 2 applications for this institution
    const institutionApplications = applications.filter(
      app => app.institutionId === course.institutionId
    );
    
    if (institutionApplications.length >= 2) {
      alert(`You can only apply for a maximum of 2 courses per institution. You already have ${institutionApplications.length} application(s) for this institution.`);
      return;
    }

    // Check if student meets course requirements
    if (!checkCourseEligibility(course)) {
      alert('You do not meet the requirements for this course.');
      return;
    }

    setSelectedCourse(course);
    setShowCourseApplication(true);
  };

  const checkCourseEligibility = (course) => {
    // Implement course eligibility logic based on student's profile
    // This could check grades, subjects, etc.
    if (!userData) return false;
    
    // Example eligibility check - you would customize this based on your requirements
    const hasRequiredDocuments = documents.some(doc => 
      doc.type === 'high_school_transcript' || doc.type === 'certificate'
    );
    
    return hasRequiredDocuments;
  };

  const handleCourseApplicationSuccess = () => {
    setShowCourseApplication(false);
    setSelectedCourse(null);
    fetchStudentApplications();
  };

  const handleAdmissionSelection = async (selectedApplicationId) => {
    try {
      // Update all admitted applications
      const updatePromises = admissionOffers.map(offer => {
        if (offer.id === selectedApplicationId) {
          return updateDoc(doc(db, 'applications', offer.id), {
            status: 'accepted',
            acceptedAt: new Date()
          });
        } else {
          return updateDoc(doc(db, 'applications', offer.id), {
            status: 'declined',
            declinedAt: new Date()
          });
        }
      });

      await Promise.all(updatePromises);
      
      // TODO: Trigger waiting list update for declined offers
      
      setShowAdmissionSelection(false);
      setAdmissionOffers([]);
      fetchStudentApplications();
      
      alert('Admission selection confirmed! You have been enrolled in your chosen program.');
    } catch (error) {
      console.error('Error processing admission selection:', error);
      alert('Error processing your selection. Please try again.');
    }
  };

  const handleDocumentUpload = (type) => {
    setDocumentType(type);
    setShowDocumentUpload(true);
  };

  const handleDocumentUploadSuccess = () => {
    setShowDocumentUpload(false);
    setDocumentType('');
    fetchDocuments();
  };

  const deleteDocument = async (documentId) => {
    try {
      await deleteDoc(doc(db, 'documents', documentId));
      fetchDocuments();
      alert('Document deleted successfully.');
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Error deleting document. Please try again.');
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <StudentOverview 
            applications={applications} 
            jobs={jobs}
            notifications={notifications}
            unreadCount={unreadNotifications}
            onMarkAsRead={markNotificationAsRead}
            onMarkAllAsRead={markAllNotificationsAsRead}
          />
        );
      case 'applications':
        return <StudentApplications applications={applications} />;
      case 'courses':
        return (
          <BrowseCourses 
            courses={courses} 
            institutions={institutions}
            applications={applications}
            onCourseApply={handleCourseApply}
          />
        );
      case 'jobs':
        return (
          <BrowseJobs 
            jobs={jobs} 
            onJobApply={(job) => {
              setSelectedJob(job);
              setShowJobApplication(true);
            }}
          />
        );
      case 'documents':
        return (
          <StudentDocuments 
            documents={documents}
            onDocumentUpload={handleDocumentUpload}
            onDeleteDocument={deleteDocument}
          />
        );
      case 'notifications':
        return (
          <StudentNotifications 
            notifications={notifications}
            onMarkAsRead={markNotificationAsRead}
            onMarkAllAsRead={markAllNotificationsAsRead}
          />
        );
      case 'profile':
        return <StudentProfile 
          studentData={userData} 
          onProfileUpdate={fetchStudentData}
        />;
      default:
        return <StudentOverview 
          applications={applications} 
          jobs={jobs}
          notifications={notifications}
          unreadCount={unreadNotifications}
          onMarkAsRead={markNotificationAsRead}
          onMarkAllAsRead={markAllNotificationsAsRead}
        />;
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
        {unreadNotifications > 0 && (
          <div className="notification-badge">
            {unreadNotifications} unread notification(s)
          </div>
        )}
      </div>

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
              className={activeTab === 'documents' ? 'active' : ''}
              onClick={() => setActiveTab('documents')}
            >
              My Documents
            </button>
          </li>
          <li>
            <button 
              className={activeTab === 'notifications' ? 'active' : ''}
              onClick={() => setActiveTab('notifications')}
            >
              Notifications {unreadNotifications > 0 && `(${unreadNotifications})`}
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

      {/* Course Application Modal */}
      {showCourseApplication && selectedCourse && (
        <CourseApplicationForm 
          course={selectedCourse}
          studentData={userData}
          existingApplications={applications}
          onClose={() => {
            setShowCourseApplication(false);
            setSelectedCourse(null);
          }}
          onSuccess={handleCourseApplicationSuccess}
        />
      )}

      {/* Job Application Modal */}
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

      {/* Admission Selection Modal */}
      {showAdmissionSelection && admissionOffers.length > 0 && (
        <AdmissionSelectionModal
          offers={admissionOffers}
          onSelect={handleAdmissionSelection}
          onClose={() => setShowAdmissionSelection(false)}
        />
      )}

      {/* Document Upload Modal */}
      {showDocumentUpload && (
        <DocumentUploadModal
          documentType={documentType}
          studentId={user.uid}
          onClose={() => {
            setShowDocumentUpload(false);
            setDocumentType('');
          }}
          onSuccess={handleDocumentUploadSuccess}
        />
      )}
    </div>
  );
};

// Enhanced Overview Component
const StudentOverview = ({ applications, jobs, notifications, unreadCount, onMarkAsRead, onMarkAllAsRead }) => {
  const stats = {
    totalApplications: applications.length,
    pendingApplications: applications.filter(app => app.status === 'pending').length,
    admittedApplications: applications.filter(app => app.status === 'admitted').length,
    acceptedApplications: applications.filter(app => app.status === 'accepted').length,
    availableJobs: jobs.length,
  };

  const recentNotifications = notifications.slice(0, 5);

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

      <div className="overview-sections">
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

        <div className="recent-notifications">
          <div className="section-header">
            <h3>Recent Notifications</h3>
            {unreadCount > 0 && (
              <button className="btn-link" onClick={onMarkAllAsRead}>
                Mark all as read
              </button>
            )}
          </div>
          <div className="notifications-preview">
            {recentNotifications.map(notification => (
              <div 
                key={notification.id} 
                className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                onClick={() => !notification.read && onMarkAsRead(notification.id)}
              >
                <p className="notification-message">{notification.message}</p>
                <small>{formatDate(notification.createdAt)}</small>
              </div>
            ))}
            {notifications.length === 0 && (
              <div className="empty-state">No notifications</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Enhanced Applications Component
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

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { class: 'status-pending', label: 'Under Review' },
      admitted: { class: 'status-admitted', label: 'Admitted' },
      accepted: { class: 'status-accepted', label: 'Enrolled' },
      declined: { class: 'status-declined', label: 'Declined' },
      rejected: { class: 'status-rejected', label: 'Not Admitted' }
    };

    const config = statusConfig[status] || { class: 'status-pending', label: status };
    return <span className={`status ${config.class}`}>{config.label}</span>;
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
              {getStatusBadge(application.status)}
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
                <p>🎉 Congratulations! You have been admitted to this program.</p>
                <p><strong>Next Steps:</strong> You will need to select one admission offer if you have multiple offers.</p>
              </div>
            )}

            {application.status === 'accepted' && (
              <div className="admission-accepted">
                <p>✅ You have accepted this admission offer and are enrolled in the program.</p>
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

// Enhanced Courses Component with Application Limits
const BrowseCourses = ({ courses, institutions, applications, onCourseApply }) => {
  const [selectedInstitution, setSelectedInstitution] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('');

  const filteredCourses = courses.filter(course => {
    if (selectedInstitution && course.institutionId !== selectedInstitution) return false;
    if (selectedFaculty && course.facultyName !== selectedFaculty) return false;
    return true;
  });

  const faculties = [...new Set(courses.map(course => course.facultyName).filter(Boolean))];

  const getApplicationCount = (institutionId) => {
    return applications.filter(app => app.institutionId === institutionId).length;
  };

  const canApplyToInstitution = (institutionId) => {
    return getApplicationCount(institutionId) < 2;
  };

  return (
    <div className="browse-courses">
      <div className="section-header">
        <h2>Browse Courses</h2>
        <p className="section-description">
          Explore available courses from various institutions. You can apply for maximum 2 courses per institution.
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
              <option key={inst.id} value={inst.id}>
                {inst.name} ({getApplicationCount(inst.id)}/2 applications)
              </option>
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
          const applicationCount = getApplicationCount(course.institutionId);
          const canApply = canApplyToInstitution(course.institutionId);

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
                <p><strong>Applications to this institution:</strong> {applicationCount}/2</p>
              </div>
              
              <div className="course-description">
                <p>{course.description || 'No description available.'}</p>
              </div>
              
              <div className="course-requirements">
                <h4>Requirements:</h4>
                <p>{course.requirements || 'No specific requirements listed.'}</p>
              </div>
              
              <button 
                className={`btn-primary ${!canApply ? 'disabled' : ''}`} 
                onClick={() => onCourseApply(course)}
                disabled={!canApply}
              >
                {canApply ? 'Apply for this Course' : 'Application Limit Reached'}
              </button>
              
              {!canApply && (
                <p className="limit-warning">
                  You have reached the maximum of 2 applications for {institution?.name}.
                </p>
              )}
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

// Enhanced Jobs Component
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
              <p><strong>Application Deadline:</strong> {formatDate(job.deadline)}</p>
            </div>
            
            <div className="job-description">
              <p>{job.description}</p>
            </div>
            
            <div className="job-requirements">
              <h4>Requirements:</h4>
              <p>{job.requirements}</p>
            </div>

            <div className="job-qualifications">
              <h4>Preferred Qualifications:</h4>
              <p>{job.qualifications || 'Not specified'}</p>
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

// New Documents Management Component
const StudentDocuments = ({ documents, onDocumentUpload, onDeleteDocument }) => {
  const documentTypes = [
    { value: 'high_school_transcript', label: 'High School Transcript' },
    { value: 'birth_certificate', label: 'Birth Certificate' },
    { value: 'id_copy', label: 'ID Copy' },
    { value: 'academic_transcript', label: 'Academic Transcript' },
    { value: 'degree_certificate', label: 'Degree Certificate' },
    { value: 'professional_certificate', label: 'Professional Certificate' },
    { value: 'other', label: 'Other Document' }
  ];

  const getDocumentTypeLabel = (type) => {
    const docType = documentTypes.find(doc => doc.value === type);
    return docType ? docType.label : type;
  };

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
    <div className="student-documents">
      <div className="section-header">
        <h2>My Documents</h2>
        <div className="document-actions">
          <select 
            onChange={(e) => e.target.value && onDocumentUpload(e.target.value)}
            className="document-type-select"
          >
            <option value="">Upload New Document</option>
            {documentTypes.map(type => (
              <option key={type.value} value={type.value}>
                Upload {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="documents-grid">
        {documents.map(document => (
          <div key={document.id} className="document-card">
            <div className="document-header">
              <h3>{getDocumentTypeLabel(document.type)}</h3>
              <span className={`status status-${document.status || 'pending'}`}>
                {document.status || 'Pending Review'}
              </span>
            </div>
            
            <div className="document-details">
              <p><strong>File Name:</strong> {document.fileName}</p>
              <p><strong>Uploaded:</strong> {formatDate(document.uploadedAt)}</p>
              <p><strong>File Size:</strong> {document.fileSize || 'N/A'}</p>
              {document.reviewedAt && (
                <p><strong>Reviewed:</strong> {formatDate(document.reviewedAt)}</p>
              )}
            </div>

            {document.feedback && (
              <div className="document-feedback">
                <strong>Feedback:</strong>
                <p>{document.feedback}</p>
              </div>
            )}

            <div className="document-actions">
              <button className="btn-primary">Download</button>
              <button 
                className="btn-danger"
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this document?')) {
                    onDeleteDocument(document.id);
                  }
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        
        {documents.length === 0 && (
          <div className="empty-state">
            <p>No documents uploaded yet.</p>
            <p>Upload your academic transcripts and certificates to complete your profile.</p>
          </div>
        )}
      </div>

      <div className="documents-guide">
        <h3>Document Upload Guide</h3>
        <ul>
          <li>Upload clear, legible scans of your documents</li>
          <li>Accepted formats: PDF, JPG, PNG</li>
          <li>Maximum file size: 10MB per document</li>
          <li>Required documents: High School Transcript, ID Copy, Birth Certificate</li>
          <li>After studies: Upload your Academic Transcripts and Degree Certificates</li>
        </ul>
      </div>
    </div>
  );
};

// New Notifications Component
const StudentNotifications = ({ notifications, onMarkAsRead, onMarkAllAsRead }) => {
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      if (timestamp.toDate) {
        return timestamp.toDate().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      return new Date(timestamp).toLocaleDateString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const unreadCount = notifications.filter(notif => !notif.read).length;

  return (
    <div className="student-notifications">
      <div className="section-header">
        <h2>Notifications</h2>
        {unreadCount > 0 && (
          <button className="btn-primary" onClick={onMarkAllAsRead}>
            Mark All as Read
          </button>
        )}
      </div>

      <div className="notifications-list">
        {notifications.map(notification => (
          <div 
            key={notification.id} 
            className={`notification-card ${notification.read ? 'read' : 'unread'}`}
            onClick={() => !notification.read && onMarkAsRead(notification.id)}
          >
            <div className="notification-content">
              <p className="notification-message">{notification.message}</p>
              <small className="notification-date">
                {formatDate(notification.createdAt)}
              </small>
            </div>
            {!notification.read && (
              <span className="unread-indicator">New</span>
            )}
          </div>
        ))}
        
        {notifications.length === 0 && (
          <div className="empty-state">
            <p>No notifications at this time.</p>
            <p>You'll receive notifications about your applications, admissions, and job opportunities here.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Enhanced Profile Component
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
      const userDocRef = doc(db, 'users', studentData.uid);
      await updateDoc(userDocRef, {
        ...formData,
        updatedAt: new Date()
      });

      setIsEditing(false);
      alert('Profile updated successfully!');
      onProfileUpdate();
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

// Utility function for date formatting
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

export default StudentDashboard;
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Spinner, Modal, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import Sidebar from '../../components/Sidebar';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { FileText, Eye, FilePlus, Trash2, AlertTriangle } from 'lucide-react';

const MyApplications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingApp, setDeletingApp] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [alertMsg, setAlertMsg] = useState(null);
  const [alertType, setAlertType] = useState('success');

  const fetchApplications = async () => {
    try {
      const res = await axiosClient.get('/applications/mine');
      if (res.data.success) {
        setApplications(res.data.applications || []);
      }
    } catch (e) {
      console.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleDeleteApplication = async () => {
    if (!deletingApp) return;
    setIsDeleting(true);

    try {
      const res = await axiosClient.delete(`/applications/${deletingApp._id}`);
      if (res.data.success) {
        setApplications(prev => prev.filter(a => a._id !== deletingApp._id));
        setAlertType('success');
        setAlertMsg(`Application #${deletingApp.applicationNo} and all associated documents were permanently deleted.`);
      }
    } catch (err) {
      setAlertType('danger');
      setAlertMsg(err.response?.data?.message || 'Failed to delete application.');
    } finally {
      setIsDeleting(false);
      setDeletingApp(null);
    }
  };

  const columns = [
    {
      label: 'Application No',
      accessor: 'applicationNo',
      render: (row) => <strong className="text-primary">{row.applicationNo}</strong>
    },
    {
      label: 'Scheme',
      accessor: (row) => row.schemeId?.name || row.schemeId?.code || 'N/A',
      render: (row) => (
        <div>
          <div className="fw-bold">{row.schemeId?.name}</div>
          <div className="small text-muted">{row.schemeId?.code} — {row.schemeId?.level?.toUpperCase()}</div>
        </div>
      )
    },
    {
      label: 'Current Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status} />
    },
    {
      label: 'Submitted Date',
      accessor: (row) => row.submittedAt ? new Date(row.submittedAt).toLocaleDateString('en-IN') : 'Draft',
      render: (row) => row.submittedAt ? new Date(row.submittedAt).toLocaleDateString('en-IN') : <span className="text-muted">Draft</span>
    },
    {
      label: 'Actions',
      sortable: false,
      render: (row) => (
        <div className="d-flex align-items-center gap-1.5 flex-wrap">
          <Link to={`/applicant/applications/${row._id}`} className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1">
            <Eye size={14} /> View
          </Link>
          <Button
            variant="outline-danger"
            size="sm"
            className="d-inline-flex align-items-center gap-1"
            onClick={() => setDeletingApp(row)}
            title="Permanently Delete Application"
          >
            <Trash2 size={13} /> Delete
          </Button>
        </div>
      )
    }
  ];

  return (
    <Container fluid className="py-4 px-lg-4">
      <Row className="gy-4">
        <Col lg={3} md={4}>
          <Sidebar />
        </Col>

        <Col lg={9} md={8}>
          <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
            <div>
              <h4 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                <FileText size={24} className="text-primary" />
                <span>My Submitted Applications</span>
              </h4>
              <p className="text-muted small mb-0">
                Track live stage progress, view OCR extraction results, delete unwanted applications, and resolve deficiencies.
              </p>
            </div>

            <Link to="/applicant/applications/new" className="btn btn-gov-primary btn-sm fw-bold px-3 py-2">
              <FilePlus size={16} className="me-1" /> Apply for Scheme
            </Link>
          </div>

          {alertMsg && (
            <Alert variant={alertType} dismissible onClose={() => setAlertMsg(null)} className="py-2.5 small mb-3">
              {alertMsg}
            </Alert>
          )}

          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={applications}
              searchPlaceholder="Search by Application No, Scheme..."
              exportFilename="my_scholarship_applications"
            />
          )}

          {/* Delete Confirmation Modal */}
          <Modal show={Boolean(deletingApp)} onHide={() => setDeletingApp(null)} centered>
            <Modal.Header closeButton className="bg-light">
              <Modal.Title className="fs-6 fw-bold text-danger d-flex align-items-center gap-2">
                <AlertTriangle size={18} /> Confirm Application Deletion
              </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-4">
              <p className="text-dark mb-2">
                Are you sure you want to permanently delete application <strong>#{deletingApp?.applicationNo}</strong> (<em>{deletingApp?.schemeId?.name}</em>)?
              </p>
              <div className="alert alert-danger py-2 small mb-0">
                <strong>Warning:</strong> This action will permanently remove this application, all uploaded documents (Aadhaar, income, marksheet, etc.), OCR scan data, and deficiency history from the database and storage.
              </div>
            </Modal.Body>
            <Modal.Footer className="bg-light">
              <Button variant="secondary" size="sm" onClick={() => setDeletingApp(null)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                className="fw-bold d-inline-flex align-items-center gap-1.5"
                onClick={handleDeleteApplication}
                disabled={isDeleting}
              >
                {isDeleting ? <Spinner size="sm" animation="border" /> : <Trash2 size={14} />}
                <span>Delete Permanently</span>
              </Button>
            </Modal.Footer>
          </Modal>
        </Col>
      </Row>
    </Container>
  );
};

export default MyApplications;


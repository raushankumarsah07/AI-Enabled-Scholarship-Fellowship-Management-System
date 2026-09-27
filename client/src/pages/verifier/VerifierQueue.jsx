import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Badge, Spinner, Modal, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import Sidebar from '../../components/Sidebar';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { INDIAN_STATES, UNION_TERRITORIES, ALL_INDIAN_STATES_AND_UTS } from '../../constants/indianStates';
import { ShieldCheck, AlertTriangle, Eye, Filter, CheckCircle2, Trash2, RefreshCw } from 'lucide-react';

const VerifierQueue = () => {
  const [queue, setQueue] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedScheme, setSelectedScheme] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [stateFilter, setStateFilter] = useState('');

  // Deletion state
  const [deletingApp, setDeletingApp] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [alertMsg, setAlertMsg] = useState(null);
  const [alertType, setAlertType] = useState('success');

  const fetchQueue = async () => {
    setLoading(true);
    try {
      let url = `/verifier/queue?status=${selectedStatus}&flagged=${flaggedOnly}`;
      if (selectedScheme) url += `&schemeId=${selectedScheme}`;
      if (stateFilter) url += `&state=${encodeURIComponent(stateFilter)}`;

      const [qRes, sRes] = await Promise.all([
        axiosClient.get(url),
        axiosClient.get('/schemes?active=true')
      ]);

      if (qRes.data.success) {
        setQueue(qRes.data.queue || []);
      }
      if (sRes.data.success) {
        setSchemes(sRes.data.schemes || []);
      }
    } catch (e) {
      console.error('Failed to load verifier queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [selectedScheme, selectedStatus, flaggedOnly, stateFilter]);

  const handleDeleteApplication = async () => {
    if (!deletingApp) return;
    setIsDeleting(true);

    try {
      const res = await axiosClient.delete(`/applications/${deletingApp._id}`);
      if (res.data.success) {
        setQueue(prev => prev.filter(a => a._id !== deletingApp._id));
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

  const getApplicantState = (row) => {
    return (
      row.applicantId?.profile?.state ||
      row.applicantId?.state ||
      row.formData?.state ||
      row.formData?.personalDetails?.state ||
      row.formData?.domicileState ||
      'N/A'
    );
  };

  const columns = [
    {
      label: 'Application No',
      accessor: 'applicationNo',
      render: (row) => (
        <div>
          <strong className="text-primary">{row.applicationNo}</strong>
          {row.documentsSummary?.hasFlags && (
            <Badge bg="danger" className="ms-2">Flagged Mismatches</Badge>
          )}
        </div>
      )
    },
    {
      label: 'Applicant Name',
      accessor: (row) => row.applicantId?.name || 'N/A',
      render: (row) => (
        <div>
          <div className="fw-bold">{row.applicantId?.name || <span className="text-muted fst-italic">Unknown / Deleted</span>}</div>
          <div className="small text-muted">{row.applicantId?.email || ''}</div>
        </div>
      )
    },
    {
      label: 'Scheme',
      accessor: (row) => row.schemeId?.name || 'N/A',
      render: (row) => <span className="badge bg-light text-dark border">{row.schemeId?.code || 'SCHEME'}</span>
    },
    {
      label: 'State',
      accessor: (row) => getApplicantState(row),
      render: (row) => {
        const st = getApplicantState(row);
        return <span className="fw-semibold text-dark">{st}</span>;
      }
    },
    {
      label: 'Doc Status',
      accessor: (row) => `${row.documentsSummary?.approved}/${row.documentsSummary?.total}`,
      render: (row) => (
        <span className="small">
          <strong>{row.documentsSummary?.approved}</strong> of {row.documentsSummary?.total} Approved
          {row.documentsSummary?.pending > 0 && (
            <span className="text-warning fw-bold ms-1">({row.documentsSummary?.pending} Pending)</span>
          )}
        </span>
      )
    },
    {
      label: 'Stage',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status} size="sm" />
    },
    {
      label: 'Action',
      sortable: false,
      render: (row) => (
        <div className="d-flex align-items-center gap-1.5 flex-wrap">
          <Link to={`/verifier/review/${row._id}`} className="btn btn-gov-primary btn-sm fw-semibold d-inline-flex align-items-center gap-1">
            <Eye size={14} /> Scrutinize
          </Link>
          <Button
            variant="outline-danger"
            size="sm"
            className="d-inline-flex align-items-center gap-1"
            onClick={() => setDeletingApp(row)}
            title="Permanently Delete / Purge Application"
          >
            <Trash2 size={13} />
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
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
            <div>
              <h4 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                <ShieldCheck size={24} className="text-primary" />
                <span>Document Verification Queue</span>
              </h4>
              <p className="text-muted small mb-0">
                Review OCR extraction confidence, inspect declared vs extracted mismatches, and approve documents.
              </p>
            </div>
            <Button
              variant="outline-secondary"
              size="sm"
              className="d-flex align-items-center gap-1 fw-semibold"
              onClick={fetchQueue}
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Queue
            </Button>
          </div>

          {alertMsg && (
            <Alert variant={alertType} dismissible onClose={() => setAlertMsg(null)} className="py-2.5 small mb-3">
              {alertMsg}
            </Alert>
          )}

          {/* Filter Toolbar */}
          <Card className="gov-card p-3 mb-4 border bg-white shadow-sm">
            <Row className="gy-2 align-items-center">
              <Col md={3}>
                <Form.Label className="small fw-bold mb-1">Filter Scheme</Form.Label>
                <Form.Select size="sm" value={selectedScheme} onChange={(e) => setSelectedScheme(e.target.value)}>
                  <option value="">All Schemes</option>
                  {schemes.map(s => <option key={s._id} value={s._id}>{s.name} ({s.code})</option>)}
                </Form.Select>
              </Col>

              <Col md={3}>
                <Form.Label className="small fw-bold mb-1">Stage Status</Form.Label>
                <Form.Select size="sm" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                  <option value="ALL">All Active Stages</option>
                  <option value="UNDER_VERIFICATION">Under Verification</option>
                  <option value="AUTO_VERIFIED">Auto-Verified</option>
                  <option value="DEFICIENT">Deficient</option>
                  <option value="OCR_PROCESSING">OCR Processing</option>
                </Form.Select>
              </Col>

              <Col md={3}>
                <Form.Label className="small fw-bold mb-1">Applicant State</Form.Label>
                <Form.Select size="sm" value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
                  <option value="">All Indian States & UTs (36)</option>
                  <optgroup label="28 Indian States (A–Z)">
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="8 Union Territories">
                    {UNION_TERRITORIES.map((ut) => (
                      <option key={ut} value={ut}>
                        {ut}
                      </option>
                    ))}
                  </optgroup>
                </Form.Select>
              </Col>

              <Col md={3} className="d-flex align-items-end">
                <Form.Check
                  type="checkbox"
                  id="flagged-toggle"
                  label="Flagged Issues Only"
                  checked={flaggedOnly}
                  onChange={(e) => setFlaggedOnly(e.target.checked)}
                  className="fw-bold small text-danger"
                />
              </Col>
            </Row>
          </Card>

          {/* Verification Table */}
          {loading ? (
            <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
          ) : (
            <DataTable
              columns={columns}
              data={queue}
              searchPlaceholder="Search applicant, application number..."
              exportFilename="verifier_queue_data"
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
                Are you sure you want to permanently delete application <strong>#{deletingApp?.applicationNo}</strong>?
              </p>
              <div className="alert alert-danger py-2 small mb-0">
                <strong>Warning:</strong> This will delete this application, all associated uploaded certificates, OCR scan data, and deficiencies permanently from the database.
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

export default VerifierQueue;


import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Button, Table, Spinner, Alert, Modal, Form, InputGroup } from 'react-bootstrap';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import Sidebar from '../../components/Sidebar';
import StatusBadge from '../../components/StatusBadge';
import OcrResultCard from '../../components/OcrResultCard';
import { ShieldCheck, ArrowLeft, CheckCircle2, XCircle, AlertTriangle, FileText, Cpu, History, ArrowUpDown, Filter, Search } from 'lucide-react';

const ReviewApplication = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Sorting and Filtering State
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState('DEFAULT');
  const [searchTerm, setSearchTerm] = useState('');

  // Deficiency Modal State
  const [showDeficiencyModal, setShowDeficiencyModal] = useState(false);
  const [selectedDocKey, setSelectedDocKey] = useState('');
  const [deficiencyReason, setDeficiencyReason] = useState('');
  const [deficiencyDueDays, setDeficiencyDueDays] = useState(7);

  const fetchDetails = async () => {
    try {
      const res = await axiosClient.get(`/applications/${id}`);
      if (res.data.success) {
        setData(res.data);
      }
    } catch (e) {
      setErrorMsg('Failed to load application details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleDocDecision = async (docId, decision) => {
    setActionLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    const remark = decision === 'approved'
      ? 'Document verified and approved by Verifier.'
      : 'Document rejected due to discrepancies in OCR verification.';

    try {
      const res = await axiosClient.post(`/verifier/documents/${docId}/decision`, {
        decision,
        remark
      });

      if (res.data.success) {
        setSuccessMsg(`Document marked as ${decision}.`);
        fetchDetails();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to update document decision.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRaiseDeficiency = async (e) => {
    e.preventDefault();
    if (!selectedDocKey || !deficiencyReason.trim()) return;

    setActionLoading(true);
    try {
      const res = await axiosClient.post(`/verifier/applications/${id}/deficiency`, {
        docKey: selectedDocKey,
        reason: deficiencyReason,
        dueDays: Number(deficiencyDueDays)
      });

      if (res.data.success) {
        setShowDeficiencyModal(false);
        setDeficiencyReason('');
        setSuccessMsg('Deficiency raised and notification dispatched to applicant.');
        fetchDetails();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to raise deficiency.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  const { application, documents = [], deficiencies = [] } = data || {};
  const applicant = application?.applicantId;
  const scheme = application?.schemeId;

  // Process Filtered & Sorted Documents
  let processedDocs = [...documents];

  if (searchTerm.trim()) {
    const q = searchTerm.toLowerCase();
    processedDocs = processedDocs.filter(d =>
      d.docKey.toLowerCase().includes(q) ||
      d.originalName.toLowerCase().includes(q) ||
      (d.detectedDocType && d.detectedDocType.toLowerCase().includes(q))
    );
  }

  if (filterStatus === 'FLAGGED') {
    processedDocs = processedDocs.filter(d => (d.mismatches && d.mismatches.length > 0) || d.verificationStatus === 'needs_review');
  } else if (filterStatus === 'APPROVED') {
    processedDocs = processedDocs.filter(d => d.verificationStatus === 'approved' || d.verificationStatus === 'auto_ok');
  } else if (filterStatus === 'REJECTED') {
    processedDocs = processedDocs.filter(d => d.verificationStatus === 'rejected');
  }

  if (sortBy === 'CONF_ASC') {
    processedDocs.sort((a, b) => (a.confidence || 0) - (b.confidence || 0));
  } else if (sortBy === 'CONF_DESC') {
    processedDocs.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
  } else if (sortBy === 'NAME_ASC') {
    processedDocs.sort((a, b) => a.originalName.localeCompare(b.originalName));
  } else if (sortBy === 'TYPE_ASC') {
    processedDocs.sort((a, b) => (a.detectedDocType || '').localeCompare(b.detectedDocType || ''));
  }

  return (
    <Container fluid className="py-4 px-lg-4">
      <Row className="gy-4">
        <Col lg={3} md={4}>
          <Sidebar />
        </Col>

        <Col lg={9} md={8}>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <Link to="/verifier/queue" className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1">
              <ArrowLeft size={14} /> Back to Queue
            </Link>
          </div>

          {successMsg && <Alert variant="success" className="py-2 small">{successMsg}</Alert>}
          {errorMsg && <Alert variant="danger" className="py-2 small">{errorMsg}</Alert>}

          {/* Applicant & Scheme Header */}
          <Card className="gov-card p-4 mb-4 border">
            <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
              <div>
                <span className="badge bg-primary text-uppercase fw-bold mb-1">{scheme?.code}</span>
                <h4 className="fw-bold text-dark mb-1">{applicant?.name}</h4>
                <div className="text-muted small">
                  Application Ref: <strong className="text-primary">{application?.applicationNo}</strong> | Email: <strong>{applicant?.email}</strong> | Phone: <strong>{applicant?.phone}</strong>
                </div>
              </div>
              <div>
                <StatusBadge status={application?.status} size="lg" />
              </div>
            </div>

            {/* Profile Baseline vs Declared Grid */}
            <div className="bg-light p-3 rounded small">
              <Row className="gy-2">
                <Col md={3} xs={6}>
                  <span className="text-muted d-block">Social Category:</span>
                  <strong className="text-dark">{applicant?.profile?.category || 'ST'}</strong>
                </Col>
                <Col md={3} xs={6}>
                  <span className="text-muted d-block">Declared Family Income:</span>
                  <strong className="text-dark">₹{(application?.formData?.familyIncome || applicant?.profile?.familyIncome || 0).toLocaleString('en-IN')}</strong>
                </Col>
                <Col md={3} xs={6}>
                  <span className="text-muted d-block">Qualifying Marks:</span>
                  <strong className="text-dark">{application?.formData?.marksPercent || applicant?.profile?.education?.marksPercent || 0}%</strong>
                </Col>
                <Col md={3} xs={6}>
                  <span className="text-muted d-block">Aadhaar (Last 4):</span>
                  <strong className="text-dark">{applicant?.profile?.aadhaarLast4 || 'N/A'}</strong>
                </Col>
              </Row>
            </div>
          </Card>

          {/* Scrutiny Document Panel with Sort & Filter Controls */}
          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
              <h5 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                <ShieldCheck size={20} className="text-primary" />
                <span>Document Verification &amp; Scrutiny Panel ({documents.length} Total Files)</span>
              </h5>
            </div>

            {/* Filter and Sort Toolbar */}
            <Card className="p-3 mb-3 bg-light border shadow-sm">
              <Row className="g-2 align-items-center">
                <Col md={4} sm={12}>
                  <InputGroup size="sm">
                    <InputGroup.Text className="bg-white"><Search size={14} className="text-muted" /></InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder="Filter by certificate name or type..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </InputGroup>
                </Col>

                <Col md={4} sm={6}>
                  <div className="d-flex align-items-center gap-1.5">
                    <Filter size={14} className="text-muted flex-shrink-0" />
                    <Form.Select
                      size="sm"
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="bg-white"
                    >
                      <option value="ALL">All Documents ({documents.length})</option>
                      <option value="FLAGGED">Flagged / Needs Review</option>
                      <option value="APPROVED">Approved / Auto-Verified</option>
                      <option value="REJECTED">Rejected</option>
                    </Form.Select>
                  </div>
                </Col>

                <Col md={4} sm={6}>
                  <div className="d-flex align-items-center gap-1.5">
                    <ArrowUpDown size={14} className="text-muted flex-shrink-0" />
                    <Form.Select
                      size="sm"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="bg-white"
                    >
                      <option value="DEFAULT">Sort: Default Order</option>
                      <option value="CONF_ASC">Confidence: Low to High (Risky First)</option>
                      <option value="CONF_DESC">Confidence: High to Low</option>
                      <option value="NAME_ASC">Document Name: A → Z</option>
                      <option value="TYPE_ASC">Detected Type: A → Z</option>
                    </Form.Select>
                  </div>
                </Col>
              </Row>
            </Card>

            {processedDocs.length === 0 ? (
              <div className="text-center py-4 bg-light rounded border text-muted small">
                No documents match the active filter criteria.
              </div>
            ) : (
              processedDocs.map((doc) => (
                <Card key={doc._id} className="gov-card mb-4 border shadow-sm">
                  <Card.Body className="p-3">
                    <OcrResultCard document={doc} />

                    {/* Verifier Action Toolbar */}
                    <div className="p-3 bg-light rounded border d-flex justify-content-between align-items-center flex-wrap gap-2 mt-2">
                      <div className="small">
                        Verification Status: <strong className="text-uppercase">{doc.verificationStatus}</strong>
                      </div>

                      <div className="d-flex gap-2">
                        <Button
                          variant="success"
                          size="sm"
                          className="fw-semibold d-inline-flex align-items-center gap-1"
                          onClick={() => handleDocDecision(doc._id, 'approved')}
                          disabled={actionLoading}
                        >
                          <CheckCircle2 size={15} /> Approve Document
                        </Button>

                        <Button
                          variant="outline-danger"
                          size="sm"
                          className="fw-semibold d-inline-flex align-items-center gap-1"
                          onClick={() => handleDocDecision(doc._id, 'rejected')}
                          disabled={actionLoading}
                        >
                          <XCircle size={15} /> Reject
                        </Button>

                        <Button
                          variant="warning"
                          size="sm"
                          className="fw-bold text-dark d-inline-flex align-items-center gap-1"
                          onClick={() => {
                            setSelectedDocKey(doc.docKey);
                            setShowDeficiencyModal(true);
                          }}
                          disabled={actionLoading}
                        >
                          <AlertTriangle size={15} /> Raise Deficiency
                        </Button>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              ))
            )}
          </div>

          {/* Raise Deficiency Modal */}
          <Modal show={showDeficiencyModal} onHide={() => setShowDeficiencyModal(false)} centered>
            <Modal.Header closeButton className="bg-light">
              <Modal.Title className="fs-6 fw-bold text-warning d-flex align-items-center gap-2">
                <AlertTriangle size={18} />
                <span>Raise Official Deficiency Notice</span>
              </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-3">
              <Form onSubmit={handleRaiseDeficiency}>
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-bold">Target Document</Form.Label>
                  <Form.Control type="text" value={selectedDocKey} disabled className="bg-light" />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label className="small fw-bold">Deficiency Reason / Required Rectification</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    placeholder="e.g. Income certificate is older than 12 months. Please upload latest certificate issued by Tahsildar."
                    value={deficiencyReason}
                    onChange={(e) => setDeficiencyReason(e.target.value)}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label className="small fw-bold">Resolution Grace Period (Days)</Form.Label>
                  <Form.Select
                    value={deficiencyDueDays}
                    onChange={(e) => setDeficiencyDueDays(e.target.value)}
                  >
                    <option value={7}>7 Days (Standard)</option>
                    <option value={10}>10 Days</option>
                    <option value={14}>14 Days</option>
                  </Form.Select>
                </Form.Group>

                <div className="d-flex justify-content-end gap-2">
                  <Button variant="outline-secondary" size="sm" onClick={() => setShowDeficiencyModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="warning" size="sm" className="fw-bold text-dark" disabled={actionLoading}>
                    {actionLoading ? <Spinner size="sm" animation="border" /> : 'Raise & Notify Applicant'}
                  </Button>
                </div>
              </Form>
            </Modal.Body>
          </Modal>
        </Col>
      </Row>
    </Container>
  );
};

export default ReviewApplication;

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Button, Form, Table, Spinner, ProgressBar, Modal, Alert } from 'react-bootstrap';
import axiosClient from '../../api/axiosClient';
import Sidebar from '../../components/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { Award, ListFilter, Users, CheckCircle, Clock, Send } from 'lucide-react';

// Real status of each row (the list is a preview until an officer publishes it)
const STATUS_BADGE = {
  SELECTED: ['success', 'Selected'],
  MERIT_LISTED: ['primary', 'Recommended'],
  WAITLISTED: ['warning', 'Waitlisted'],
  ELIGIBLE: ['secondary', 'Eligible - not yet recommended'],
  UNDER_SCRUTINY: ['secondary', 'Under Scrutiny']
};

const MeritList = () => {
  const { user } = useAuth();
  const isOfficer = user?.role === 'officer';
  const [schemes, setSchemes] = useState([]);
  const [selectedSchemeId, setSelectedSchemeId] = useState('');
  const [meritData, setMeritData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [showPublish, setShowPublish] = useState(false);
  const [publishRemarks, setPublishRemarks] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    const fetchSchemes = async () => {
      try {
        const res = await axiosClient.get('/schemes?active=true');
        if (res.data.success && res.data.schemes?.length > 0) {
          setSchemes(res.data.schemes);
          setSelectedSchemeId(res.data.schemes[0]._id);
        }
      } catch (e) {}
    };
    fetchSchemes();
  }, []);

  useEffect(() => {
    if (!selectedSchemeId) return;
    const fetchMerit = async () => {
      setLoading(true);
      try {
        const res = await axiosClient.get(`/admin/merit/${selectedSchemeId}`);
        if (res.data.success) {
          setMeritData(res.data);
        }
      } catch (e) {
        console.error('Failed to load merit list');
      } finally {
        setLoading(false);
      }
    };
    fetchMerit();
  }, [selectedSchemeId, reloadKey]);

  const allRows = [...(meritData?.provisionalList || []), ...(meritData?.waitingList || [])];
  const recommendedCount = allRows.filter(r => r.currentStatus === 'MERIT_LISTED').length;

  const handlePublish = async () => {
    setPublishing(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await axiosClient.post(`/officer/merit/${selectedSchemeId}/publish`, { remarks: publishRemarks });
      if (res.data.success) {
        setSuccessMsg(res.data.message);
        setShowPublish(false);
        setPublishRemarks('');
        setReloadKey(k => k + 1);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to publish the merit list.');
      setShowPublish(false);
    } finally {
      setPublishing(false);
    }
  };

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
                <Award size={24} className="text-primary" />
                <span>Merit Ranking & Score Breakdown</span>
              </h4>
              <p className="text-muted small mb-0">
                Multi-component weighted scores and horizontal reservation quota allocations.
              </p>
            </div>

            <div className="d-flex align-items-center gap-2 flex-wrap">
              <div style={{ minWidth: '240px' }}>
                <Form.Select
                  size="sm"
                  value={selectedSchemeId}
                  onChange={(e) => { setSelectedSchemeId(e.target.value); setSuccessMsg(null); setErrorMsg(null); }}
                >
                  {schemes.map(s => (
                    <option key={s._id} value={s._id}>{s.name} ({s.code})</option>
                  ))}
                </Form.Select>
              </div>
              {isOfficer ? (
                <Button
                  size="sm"
                  variant="success"
                  className="fw-bold d-inline-flex align-items-center gap-1"
                  onClick={() => setShowPublish(true)}
                  disabled={!meritData || recommendedCount === 0}
                  title={recommendedCount === 0 ? 'No recommended applications waiting to be published' : ''}
                >
                  <Send size={14} /> Publish Merit List
                </Button>
              ) : (
                <Badge bg="light" text="dark" className="border">View only - an officer publishes the merit list</Badge>
              )}
            </div>
          </div>

          {successMsg && <Alert variant="success" className="py-2 small fw-semibold">{successMsg}</Alert>}
          {errorMsg && <Alert variant="danger" className="py-2 small fw-semibold">{errorMsg}</Alert>}

          <Modal show={showPublish} onHide={() => setShowPublish(false)} centered>
            <Modal.Header closeButton className="bg-light">
              <Modal.Title className="fs-6 fw-bold">Publish Merit List</Modal.Title>
            </Modal.Header>
            <Modal.Body className="small">
              <p className="mb-2">
                Only <strong>recommended</strong> applications ({recommendedCount}) will be selected, within{' '}
                <strong>{meritData?.totalSeats}</strong> seats and the reserved quotas. Selected students are notified and
                their first installment is scheduled.
              </p>
              <Form.Group>
                <Form.Label className="fw-semibold">Remark (required)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={publishRemarks}
                  onChange={(e) => setPublishRemarks(e.target.value)}
                  placeholder="e.g. Approved by the Selection Committee, meeting dated 25/09/2026"
                />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="outline-secondary" size="sm" onClick={() => setShowPublish(false)}>Cancel</Button>
              <Button variant="success" size="sm" className="fw-bold" onClick={handlePublish} disabled={publishing || !publishRemarks.trim()}>
                {publishing ? <Spinner size="sm" animation="border" /> : 'Publish'}
              </Button>
            </Modal.Footer>
          </Modal>

          {loading ? (
            <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
          ) : !meritData ? (
            <div className="text-center py-5 text-muted">No merit data available.</div>
          ) : (
            <>
              {/* Quota & Seat Allocation Header */}
              <Card className="gov-card p-3 mb-4 border bg-light">
                <Row className="text-center gy-2">
                  <Col md={3} xs={6} className="border-end">
                    <div className="small text-muted">Total Available Seats</div>
                    <div className="fs-4 fw-bold text-dark">{meritData.totalSeats}</div>
                  </Col>
                  <Col md={3} xs={6} className="border-end">
                    <div className="small text-muted">Eligible Candidates</div>
                    <div className="fs-4 fw-bold text-primary">{meritData.totalEligible}</div>
                  </Col>
                  <Col md={3} xs={6} className="border-end">
                    <div className="small text-muted">Female Quota (30%)</div>
                    <div className="fs-4 fw-bold text-success">{meritData.quotaBreakdown?.femaleSelected} / {meritData.quotaBreakdown?.femaleSeats}</div>
                  </Col>
                  <Col md={3} xs={6}>
                    <div className="small text-muted">PwD Quota (4%)</div>
                    <div className="fs-4 fw-bold text-info">{meritData.quotaBreakdown?.pwdSelected} / {meritData.quotaBreakdown?.pwdSeats}</div>
                  </Col>
                </Row>
              </Card>

              {/* Provisional Selected Merit List */}
              <Card className="gov-card p-3 mb-4 border">
                <h5 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                  <CheckCircle size={20} className="text-success" />
                  <span>Provisional Merit Selection ({meritData.provisionalList?.length || 0} Candidates)</span>
                </h5>

                <div className="table-responsive">
                  <Table bordered hover size="sm" className="gov-table small align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: '8%' }}>Rank</th>
                        <th style={{ width: '22%' }}>Applicant Details</th>
                        <th style={{ width: '15%' }}>Category Allocation</th>
                        <th style={{ width: '35%' }}>Score Breakdown (Academic + Exam + Interview)</th>
                        <th style={{ width: '10%' }} className="text-center">Total Score</th>
                        <th style={{ width: '10%' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {meritData.provisionalList?.map((item) => (
                        <tr key={item.application._id} className="table-success bg-opacity-10">
                          <td className="fw-bold text-center fs-6">#{item.meritRank}</td>
                          <td>
                            <div className="fw-bold text-dark">{item.applicantName}</div>
                            <div className="small text-muted">{item.application.applicationNo} | {item.state}</div>
                          </td>
                          <td>
                            <Badge bg="success">{item.selectionCategory}</Badge>
                          </td>
                          <td>
                            <div className="d-flex flex-column gap-1">
                              {item.meritBreakdown && Object.entries(item.meritBreakdown).map(([k, v]) => (
                                <div key={k} className="d-flex justify-content-between small text-muted">
                                  <span>{v.label} (wt {v.weight * 100}%):</span>
                                  <strong>{v.weightedScore} pts ({v.rawScore} raw)</strong>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="text-center">
                            <span className="fs-6 fw-bold text-success">{item.meritScore}</span> / 100
                          </td>
                          <td>
                            {(() => {
                              const [bg, label] = STATUS_BADGE[item.currentStatus] || ['secondary', item.currentStatus];
                              return <Badge bg={bg}>{label}</Badge>;
                            })()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </Card>

              {/* Waiting List */}
              {meritData.waitingList?.length > 0 && (
                <Card className="gov-card p-3 border">
                  <h5 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                    <Clock size={20} className="text-warning" />
                    <span>Official Waiting List ({meritData.waitingList?.length} Candidates)</span>
                  </h5>

                  <div className="table-responsive">
                    <Table bordered hover size="sm" className="gov-table small align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Waitlist Position</th>
                          <th>Overall Rank</th>
                          <th>Applicant Name</th>
                          <th>Application No</th>
                          <th>State</th>
                          <th>Total Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {meritData.waitingList.map((item) => (
                          <tr key={item.application._id}>
                            <td className="fw-bold text-warning">WL #{item.waitlistRank}</td>
                            <td>#{item.meritRank}</td>
                            <td className="fw-bold">{item.applicantName}</td>
                            <td>{item.application.applicationNo}</td>
                            <td>{item.state}</td>
                            <td className="fw-bold text-dark">{item.meritScore} pts</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </Card>
              )}
            </>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default MeritList;

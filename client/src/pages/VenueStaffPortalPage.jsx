import React from 'react';
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  ClipboardList,
  Edit3,
  FileText,
  Filter,
  Flame,
  MapPin,
  PlayCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Volume2,
  XCircle,
} from 'lucide-react';
import { apiRequest } from '../services/apiClient.js';

export default function VenueStaffPortalPage({ user }) {
  const [tasks, setTasks] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [activeFilter, setActiveFilter] = React.useState('all');
  const [updatingId, setUpdatingId] = React.useState('');
  const [editingNoteId, setEditingNoteId] = React.useState(null);
  const [noteText, setNoteText] = React.useState('');

  const loadTasks = React.useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiRequest('/venue-staff/tasks');
      setTasks(res.items || []);
    } catch (err) {
      setError(err.message || 'Could not load venue tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadTasks();
    const handleChanged = () => loadTasks();
    window.addEventListener('eventoria:data-changed', handleChanged);
    window.addEventListener('focus', handleChanged);
    return () => {
      window.removeEventListener('eventoria:data-changed', handleChanged);
      window.removeEventListener('focus', handleChanged);
    };
  }, [loadTasks]);

  const updateTaskStatus = async (task, newStatus, customNotes) => {
    try {
      setUpdatingId(task._id);
      setError('');
      const body = { status: newStatus };
      if (customNotes !== undefined) {
        body.notes = customNotes;
      } else if (task.notes) {
        body.notes = task.notes;
      }
      await apiRequest(`/venue-staff/tasks/${task._id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      setEditingNoteId(null);
      await loadTasks();
      window.dispatchEvent(new Event('eventoria:data-changed'));
    } catch (err) {
      setError(err.message || 'Could not update task');
    } finally {
      setUpdatingId('');
    }
  };

  const handleSaveNotes = async (task) => {
    await updateTaskStatus(task, task.status, noteText);
  };

  const filteredTasks = tasks.filter((t) => {
    if (activeFilter === 'all') return true;
    return t.status === activeFilter;
  });

  const countByStatus = {
    all: tasks.length,
    todo: tasks.filter((t) => t.status === 'todo').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    blocked: tasks.filter((t) => t.status === 'blocked').length,
  };

  const statusBadge = (status) => {
    switch (status) {
      case 'completed':
        return {
          bg: '#ecfdf5',
          border: '#a7f3d0',
          color: '#065f46',
          label: 'Completed',
          icon: CheckCircle2,
        };
      case 'in_progress':
        return {
          bg: '#fffbeb',
          border: '#fde68a',
          color: '#b45309',
          label: 'In Progress',
          icon: Clock,
        };
      case 'blocked':
        return {
          bg: '#fef2f2',
          border: '#fecaca',
          color: '#991b1b',
          label: 'Blocked',
          icon: AlertTriangle,
        };
      default:
        return {
          bg: '#eff6ff',
          border: '#bfdbfe',
          color: '#1e40af',
          label: 'To Do',
          icon: PlayCircle,
        };
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '10px 0 40px' }}>
      {/* Role explanation header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #09172e 0%, #172c4e 100%)',
          color: '#fff',
          borderRadius: 16,
          padding: '24px 28px',
          marginBottom: 24,
          boxShadow: '0 10px 30px rgba(9, 23, 46, 0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ maxWidth: 720 }}>
            <span
              style={{
                display: 'inline-block',
                background: 'rgba(255, 255, 255, 0.12)',
                color: '#93c5fd',
                padding: '4px 12px',
                borderRadius: 99,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.05em',
                marginBottom: 10,
              }}
            >
              VENUE OPERATIONS WORKSPACE
            </span>
            <h1 style={{ fontSize: 26, margin: '0 0 8px', fontWeight: 800, color: '#fff' }}>
              Venue Staff &amp; Readiness Dashboard
            </h1>
            <p style={{ margin: 0, fontSize: 14, color: '#cbd5e1', lineHeight: 1.6 }}>
              As <strong>Venue Staff</strong>, your role is to prepare physical facilities, verify sound and lighting, coordinate vendor access, and ensure venues are 100% ready for booked events.
            </p>
          </div>
          <button
            type="button"
            onClick={loadTasks}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 16px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.08)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Tasks
          </button>
        </div>

        {/* 5 Core Pillars */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            marginTop: 22,
            paddingTop: 18,
            borderTop: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          {[
            { icon: Building2, title: 'Hall Setup', desc: 'Seating & stage layout' },
            { icon: Volume2, title: 'A/V & Lighting', desc: 'Mic, sound & spotlights' },
            { icon: Sparkles, title: 'Cleanliness', desc: 'Pre-event sanitization' },
            { icon: ShieldCheck, title: 'Guest Reception', desc: 'Entry & parking control' },
            { icon: CheckCircle2, title: 'Handover', desc: 'Post-event inspection' },
          ].map((item) => (
            <div
              key={item.title}
              style={{
                background: 'rgba(255,255,255,0.06)',
                padding: '10px 14px',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <item.icon size={18} style={{ color: '#38bdf8', flexShrink: 0 }} />
              <div>
                <b style={{ display: 'block', fontSize: 12, color: '#f8fafc' }}>{item.title}</b>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{item.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Total Assigned Tasks', val: countByStatus.all, color: '#0f172a', bg: '#f8fafc', border: '#e2e8f0' },
          { label: 'In Progress', val: countByStatus.in_progress, color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
          { label: 'Pending (To Do)', val: countByStatus.todo, color: '#1e40af', bg: '#eff6ff', border: '#bfdbfe' },
          { label: 'Completed', val: countByStatus.completed, color: '#065f46', bg: '#ecfdf5', border: '#a7f3d0' },
          { label: 'Blocked / Needs Review', val: countByStatus.blocked, color: '#991b1b', bg: '#fef2f2', border: '#fecaca' },
        ].map((m) => (
          <div
            key={m.label}
            style={{
              background: m.bg,
              border: `1px solid ${m.border}`,
              padding: '14px 16px',
              borderRadius: 12,
            }}
          >
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600, display: 'block' }}>{m.label}</span>
            <b style={{ fontSize: 24, color: m.color, marginTop: 4, display: 'block' }}>{m.val}</b>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: 6, marginRight: 4 }}>
          <Filter size={15} /> Filter:
        </span>
        {[
          { key: 'all', label: `All (${countByStatus.all})` },
          { key: 'todo', label: `To Do (${countByStatus.todo})` },
          { key: 'in_progress', label: `In Progress (${countByStatus.in_progress})` },
          { key: 'completed', label: `Completed (${countByStatus.completed})` },
          { key: 'blocked', label: `Blocked (${countByStatus.blocked})` },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveFilter(tab.key)}
            style={{
              padding: '7px 14px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              border: activeFilter === tab.key ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
              background: activeFilter === tab.key ? '#2563eb' : '#fff',
              color: activeFilter === tab.key ? '#fff' : '#475569',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Task List */}
      {loading ? (
        <p style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>Loading operational tasks…</p>
      ) : filteredTasks.length === 0 ? (
        <div
          style={{
            background: '#fff',
            border: '1.5px dashed #cbd5e1',
            borderRadius: 14,
            padding: '40px 24px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: '50%',
              background: '#eff6ff',
              color: '#2563eb',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}
          >
            <ClipboardList size={28} />
          </div>
          <h3 style={{ fontSize: 18, color: '#0f172a', margin: '0 0 6px' }}>No tasks found in this view</h3>
          <p style={{ color: '#64748b', fontSize: 13, maxWidth: 520, margin: '0 auto 16px', lineHeight: 1.5 }}>
            {activeFilter === 'all'
              ? 'When venue owners confirm customer reservations, setup and readiness tasks are automatically assigned to venue staff.'
              : `There are currently no tasks with status "${activeFilter.replace('_', ' ')}".`}
          </p>
          {activeFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                color: '#334155',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              View All Tasks
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filteredTasks.map((task) => {
            const badge = statusBadge(task.status);
            const BadgeIcon = badge.icon;
            const isUpdating = updatingId === task._id;

            return (
              <div
                key={task._id}
                style={{
                  background: '#fff',
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                  padding: '18px 20px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span
                        style={{
                          background: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`,
                          padding: '3px 9px',
                          borderRadius: 99,
                          fontSize: 12,
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                        }}
                      >
                        <BadgeIcon size={13} /> {badge.label}
                      </span>
                      {task.venue && (
                        <span style={{ fontSize: 13, color: '#475569', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Building2 size={14} style={{ color: '#64748b' }} /> {task.venue.name}
                        </span>
                      )}
                    </div>
                    <h3 style={{ fontSize: 16, color: '#0f172a', margin: '4px 0 2px', fontWeight: 700 }}>{task.title}</h3>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {task.status === 'todo' && (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => updateTaskStatus(task, 'in_progress')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '7px 14px',
                          borderRadius: 6,
                          border: 'none',
                          background: '#2563eb',
                          color: '#fff',
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        <PlayCircle size={14} /> Start Task
                      </button>
                    )}

                    {task.status === 'in_progress' && (
                      <>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => updateTaskStatus(task, 'completed')}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '7px 14px',
                            borderRadius: 6,
                            border: 'none',
                            background: '#16a34a',
                            color: '#fff',
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          <CheckCircle2 size={14} /> Mark Completed
                        </button>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => updateTaskStatus(task, 'blocked')}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '7px 12px',
                            borderRadius: 6,
                            border: '1px solid #fca5a5',
                            background: '#fef2f2',
                            color: '#dc2626',
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          <AlertTriangle size={14} /> Block
                        </button>
                      </>
                    )}

                    {task.status === 'blocked' && (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => updateTaskStatus(task, 'in_progress')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '7px 14px',
                          borderRadius: 6,
                          border: 'none',
                          background: '#ea580c',
                          color: '#fff',
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        <RefreshCw size={14} /> Resume Task
                      </button>
                    )}

                    {task.status === 'completed' && (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => updateTaskStatus(task, 'in_progress')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '6px 12px',
                          borderRadius: 6,
                          border: '1px solid #cbd5e1',
                          background: '#f8fafc',
                          color: '#475569',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Re-open
                      </button>
                    )}
                  </div>
                </div>

                {/* Reservation / Occasion Context */}
                {task.reservation && (
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      padding: '8px 12px',
                      fontSize: 12,
                      color: '#475569',
                      marginBottom: 10,
                      display: 'flex',
                      gap: 16,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span>
                      <strong>Occasion:</strong> {task.reservation.purpose}
                    </span>
                    {task.reservation.startsAt && (
                      <span>
                        <strong>Schedule:</strong> {new Date(task.reservation.startsAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    )}
                  </div>
                )}

                {/* Notes & Remarks */}
                <div style={{ marginTop: 8 }}>
                  {editingNoteId === task._id ? (
                    <div style={{ marginTop: 8 }}>
                      <textarea
                        rows={2}
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Add operational remarks or inspection findings..."
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: 6,
                          border: '1.5px solid #3b82f6',
                          fontSize: 13,
                          fontFamily: 'inherit',
                          boxSizing: 'border-box',
                        }}
                      />
                      <div style={{ display: 'flex', gap: 8, marginTop: 6, justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          onClick={() => setEditingNoteId(null)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 6,
                            border: '1px solid #cbd5e1',
                            background: '#fff',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveNotes(task)}
                          disabled={isUpdating}
                          style={{
                            padding: '6px 14px',
                            borderRadius: 6,
                            border: 'none',
                            background: '#2563eb',
                            color: '#fff',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Save Notes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 10,
                        background: '#fafafa',
                        padding: '8px 12px',
                        borderRadius: 6,
                        border: '1px solid #f1f5f9',
                      }}
                    >
                      <span style={{ fontSize: 13, color: '#334155', lineHeight: 1.5 }}>
                        <strong>Instructions / Remarks:</strong> {task.notes || 'No remarks recorded yet.'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingNoteId(task._id);
                          setNoteText(task.notes || '');
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#2563eb',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 12,
                          fontWeight: 600,
                          flexShrink: 0,
                          padding: 0,
                        }}
                      >
                        <Edit3 size={13} /> Edit Note
                      </button>
                    </div>
                  )}
                </div>

                {task.completedAt && (
                  <div style={{ marginTop: 8, fontSize: 11, color: '#059669', fontWeight: 600 }}>
                    ✓ Completed on {new Date(task.completedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

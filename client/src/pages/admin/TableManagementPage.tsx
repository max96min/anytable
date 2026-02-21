import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { TableDTO, SessionDTO } from '@anytable/shared';
import {
  getTables,
  createTables,
  updateTable,
  regenerateQr,
  getActiveSessions,
  closeSession,
} from '@/lib/admin-api';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Spinner from '@/components/ui/Spinner';

type FilterKey = 'all' | 'active' | 'in_session' | 'inactive';

function sessionDuration(startedAt: string): string {
  const diff = Date.now() - new Date(startedAt).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

const TableManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<FilterKey>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState<string | null>(null);
  const [confirmRegenerate, setConfirmRegenerate] = useState<string | null>(null);
  const [confirmCloseSession, setConfirmCloseSession] = useState<string | null>(null);

  // Add tables form
  const [startNum, setStartNum] = useState('1');
  const [endNum, setEndNum] = useState('10');
  const [seats, setSeats] = useState('4');

  // Fetch tables and sessions
  const { data: tables = [], isLoading: tablesLoading } = useQuery({
    queryKey: ['admin-tables'],
    queryFn: getTables,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['admin-sessions'],
    queryFn: getActiveSessions,
    refetchInterval: 30_000,
  });

  // Map session by table_id
  const sessionByTable = useMemo(() => {
    const map: Record<string, SessionDTO> = {};
    for (const s of sessions) {
      map[s.table_id] = s;
    }
    return map;
  }, [sessions]);

  // Create tables mutation
  const createMutation = useMutation({
    mutationFn: createTables,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tables'] });
      setShowAddModal(false);
      setStartNum('1');
      setEndNum('10');
      setSeats('4');
    },
  });

  // Update table mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateTable>[1] }) =>
      updateTable(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tables'] });
    },
  });

  // Regenerate QR mutation
  const qrMutation = useMutation({
    mutationFn: regenerateQr,
    onSuccess: (data) => {
      setConfirmRegenerate(null);
      setShowQrModal(data.qr_url);
      queryClient.invalidateQueries({ queryKey: ['admin-tables'] });
    },
  });

  // Close session mutation
  const closeMutation = useMutation({
    mutationFn: closeSession,
    onSuccess: () => {
      setConfirmCloseSession(null);
      queryClient.invalidateQueries({ queryKey: ['admin-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-tables'] });
    },
  });

  // Filter logic
  const filteredTables = useMemo(() => {
    let result = [...tables];
    switch (filter) {
      case 'active':
        result = result.filter((t) => t.status === 'ACTIVE' && !sessionByTable[t.id]);
        break;
      case 'in_session':
        result = result.filter((t) => !!sessionByTable[t.id]);
        break;
      case 'inactive':
        result = result.filter((t) => t.status === 'INACTIVE');
        break;
      default:
        break;
    }
    return result.sort((a, b) => a.table_number - b.table_number);
  }, [tables, filter, sessionByTable]);

  // Counts for filter chips
  const counts = useMemo(() => {
    const all = tables.length;
    const active = tables.filter((t) => t.status === 'ACTIVE' && !sessionByTable[t.id]).length;
    const inSession = tables.filter((t) => !!sessionByTable[t.id]).length;
    const inactive = tables.filter((t) => t.status === 'INACTIVE').length;
    return { all, active, in_session: inSession, inactive };
  }, [tables, sessionByTable]);

  const handleAddTables = () => {
    const start = parseInt(startNum, 10);
    const end = parseInt(endNum, 10);
    const s = parseInt(seats, 10);
    if (isNaN(start) || isNaN(end) || isNaN(s) || start > end || start < 1 || s < 1) return;
    createMutation.mutate({ start_number: start, end_number: end, seats: s });
  };

  const getStatusBadge = (table: TableDTO) => {
    const session = sessionByTable[table.id];
    if (session) {
      return <Badge variant="green">In Session</Badge>;
    }
    if (table.status === 'ACTIVE') {
      return <Badge variant="blue">Active</Badge>;
    }
    return <Badge variant="gray">Inactive</Badge>;
  };

  const filterChips: { key: FilterKey; label: string }[] = [
    { key: 'all', label: `All (${counts.all})` },
    { key: 'active', label: `Active (${counts.active})` },
    { key: 'in_session', label: `In Session (${counts.in_session})` },
    { key: 'inactive', label: `Inactive (${counts.inactive})` },
  ];

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 md:px-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-surface-dark">
            {t('admin.table_management')}
          </h1>
          <Button
            variant="primary"
            size="sm"
            icon="add"
            onClick={() => setShowAddModal(true)}
          >
            Add Tables
          </Button>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
          {filterChips.map((chip) => (
            <button
              key={chip.key}
              onClick={() => setFilter(chip.key)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                filter === chip.key
                  ? 'bg-primary-500 text-white border-primary-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 md:px-6 py-4">
        {tablesLoading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : filteredTables.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <Icon name="table_restaurant" size={48} className="text-gray-300" />
            <p className="text-sm text-gray-500">No tables found</p>
            <Button variant="outline" size="sm" onClick={() => setShowAddModal(true)}>
              Add your first tables
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredTables.map((table) => {
              const session = sessionByTable[table.id];
              return (
                <Card key={table.id} padding="none" className="overflow-hidden">
                  <div className="px-4 pt-4 pb-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-surface-dark">
                          T-{table.table_number}
                        </span>
                        {getStatusBadge(table)}
                      </div>
                      <div className="flex items-center gap-1 text-gray-400">
                        <Icon name="group" size={16} />
                        <span className="text-xs">{table.seats} seats</span>
                      </div>
                    </div>

                    {/* Session info */}
                    {session && (
                      <div className="bg-green-50 rounded-lg px-3 py-2 mt-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-green-700 font-medium">
                            {session.participants_count} participant{session.participants_count !== 1 ? 's' : ''}
                          </span>
                          <span className="text-green-600">
                            {sessionDuration(session.created_at)}
                          </span>
                        </div>
                        <div className="text-xs text-green-600 mt-0.5">
                          Round {session.current_round_no}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 px-3 py-2 bg-gray-50 border-t border-gray-100">
                    <button
                      onClick={() => {
                        setShowQrModal(`/api/tables/${table.id}/qr`);
                      }}
                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-gray-600 hover:bg-gray-200 transition-colors"
                      title="View QR"
                    >
                      <Icon name="qr_code" size={16} />
                      QR
                    </button>
                    <button
                      onClick={() => setConfirmRegenerate(table.id)}
                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-gray-600 hover:bg-gray-200 transition-colors"
                      title="Regenerate QR"
                    >
                      <Icon name="refresh" size={16} />
                      Regen
                    </button>
                    {session && (
                      <button
                        onClick={() => setConfirmCloseSession(session.id)}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-red-600 hover:bg-red-50 transition-colors"
                        title="Close Session"
                      >
                        <Icon name="close" size={16} />
                        Close
                      </button>
                    )}
                    <button
                      onClick={() => {
                        const newStatus = table.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
                        updateMutation.mutate({
                          id: table.id,
                          data: { status: newStatus },
                        });
                      }}
                      className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-colors ml-auto ${
                        table.status === 'ACTIVE'
                          ? 'text-gray-500 hover:bg-gray-200'
                          : 'text-green-600 hover:bg-green-50'
                      }`}
                      title={table.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                    >
                      <Icon
                        name={table.status === 'ACTIVE' ? 'toggle_on' : 'toggle_off'}
                        size={16}
                      />
                      {table.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Tables Modal */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Tables"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-500">
            Create multiple tables at once by specifying a range.
          </p>
          <div className="flex gap-3">
            <Input
              label="From Table #"
              type="number"
              min={1}
              value={startNum}
              onChange={(e) => setStartNum(e.target.value)}
            />
            <Input
              label="To Table #"
              type="number"
              min={1}
              value={endNum}
              onChange={(e) => setEndNum(e.target.value)}
            />
          </div>
          <Input
            label="Seats per table"
            type="number"
            min={1}
            max={20}
            value={seats}
            onChange={(e) => setSeats(e.target.value)}
          />
          {createMutation.isError && (
            <p className="text-sm text-red-500">
              {createMutation.error instanceof Error
                ? createMutation.error.message
                : 'Failed to create tables'}
            </p>
          )}
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="ghost" size="sm" onClick={() => setShowAddModal(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={createMutation.isPending}
              onClick={handleAddTables}
            >
              Create Tables
            </Button>
          </div>
        </div>
      </Modal>

      {/* QR Code Modal */}
      <Modal
        open={!!showQrModal}
        onClose={() => setShowQrModal(null)}
        title="QR Code"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-64 h-64 bg-gray-100 rounded-xl flex items-center justify-center border border-gray-200">
            {showQrModal ? (
              <img
                src={showQrModal}
                alt="QR Code"
                className="w-56 h-56 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : null}
            <Icon name="qr_code_2" size={80} className="text-gray-300" />
          </div>
          <p className="text-xs text-gray-400 text-center">
            Print this QR code and place it on the table for customers to scan.
          </p>
          <Button
            variant="outline"
            size="sm"
            icon="print"
            onClick={() => {
              if (showQrModal) window.open(showQrModal, '_blank');
            }}
          >
            Print QR Code
          </Button>
        </div>
      </Modal>

      {/* Confirm Regenerate QR */}
      <Modal
        open={!!confirmRegenerate}
        onClose={() => setConfirmRegenerate(null)}
        title="Regenerate QR Code?"
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
            <Icon name="warning" size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700">
              This will invalidate the current QR code. Customers with the old QR code will
              not be able to scan it. You will need to print and replace the physical QR code.
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmRegenerate(null)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={qrMutation.isPending}
              onClick={() => {
                if (confirmRegenerate) qrMutation.mutate(confirmRegenerate);
              }}
            >
              Regenerate
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirm Close Session */}
      <Modal
        open={!!confirmCloseSession}
        onClose={() => setConfirmCloseSession(null)}
        title="Close Session?"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">
            This will end the session for all participants at this table.
            Any unplaced items in the cart will be lost.
          </p>
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmCloseSession(null)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={closeMutation.isPending}
              onClick={() => {
                if (confirmCloseSession) closeMutation.mutate(confirmCloseSession);
              }}
            >
              Close Session
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TableManagementPage;

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DatabasesApi } from '../api/databases';
import { DatabaseRecord } from '../types';
import { useAuth } from '../context/AuthContext';
import DatabaseMembersModal from '../components/DatabaseMembersModal';
import DatabaseFieldsModal from '../components/DatabaseFieldsModal';
import DatabaseRecordModal from '../components/DatabaseRecordModal';

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  return String(value);
}

export default function DatabaseBoardPage() {
  const { databaseId } = useParams();
  const id = Number(databaseId);
  const { user } = useAuth();

  const { data: database } = useQuery({ queryKey: ['database', id], queryFn: () => DatabasesApi.detail(id) });
  const { data: recordsData } = useQuery({
    queryKey: ['database-records', id],
    queryFn: () => DatabasesApi.listRecords(id),
  });

  const [showMembers, setShowMembers] = useState(false);
  const [showFields, setShowFields] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);
  const [creatingRecord, setCreatingRecord] = useState(false);

  if (!database || !recordsData) return <p>Carregando...</p>;

  const currentMembership = database.members.find((m) => m.user_id === user?.id);
  const canManage =
    user?.role === 'admin' || currentMembership?.database_role === 'owner' || currentMembership?.database_role === 'manager';
  const canEdit = user?.role === 'admin' || (!!currentMembership && currentMembership.database_role !== 'viewer');

  const { fields, records } = recordsData;
  const selectedRecord: DatabaseRecord | null = records.find((r) => r.id === selectedRecordId) ?? null;

  return (
    <div className="board-page">
      <div className="page-header">
        <h1>{database.name}</h1>
        <div className="page-header-actions">
          <button className="secondary-button" onClick={() => setShowMembers(true)}>
            Membros ({database.members.length})
          </button>
          {canManage && (
            <button className="secondary-button" onClick={() => setShowFields(true)}>
              Campos
            </button>
          )}
          {canEdit && <button onClick={() => setCreatingRecord(true)}>+ Novo registro</button>}
        </div>
      </div>

      {database.description && <p className="muted topic-intro">{database.description}</p>}

      <div className="admin-table-wrap">
        <table className="admin-table cards-table">
          <thead>
            <tr>
              <th>Título</th>
              {fields.map((field) => (
                <th key={field.id}>{field.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((record) => {
              const valueByFieldId = new Map(record.fieldValues.map((v) => [v.fieldId, v.value]));
              return (
                <tr key={record.id} className="cards-table-row" onClick={() => setSelectedRecordId(record.id)}>
                  <td>{record.title}</td>
                  {fields.map((field) => (
                    <td key={field.id} className="muted">
                      {formatCellValue(valueByFieldId.get(field.id))}
                    </td>
                  ))}
                </tr>
              );
            })}
            {records.length === 0 && (
              <tr>
                <td colSpan={fields.length + 1} className="muted">
                  Nenhum registro ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showMembers && (
        <DatabaseMembersModal
          databaseId={id}
          members={database.members}
          canManage={canManage}
          onClose={() => setShowMembers(false)}
        />
      )}

      {showFields && (
        <DatabaseFieldsModal
          databaseId={id}
          fields={database.fields}
          canManage={canManage}
          onClose={() => setShowFields(false)}
        />
      )}

      {creatingRecord && (
        <DatabaseRecordModal
          databaseId={id}
          record={null}
          fields={fields}
          canEdit={canEdit}
          onClose={() => setCreatingRecord(false)}
        />
      )}

      {selectedRecord && (
        <DatabaseRecordModal
          databaseId={id}
          record={selectedRecord}
          fields={fields}
          canEdit={canEdit}
          onClose={() => setSelectedRecordId(null)}
        />
      )}
    </div>
  );
}

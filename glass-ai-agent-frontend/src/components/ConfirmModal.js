import Modal, { ModalActions } from './ui/Modal';
import { confirmStock, confirmStockLabels, actions } from '../design/copy';
import { formatAuditAction } from '../design/format';
import { type } from '../design/typography';
import { cn } from '../lib/utils';

function ConfirmModal({ show, onCancel, onConfirm, payload, title = confirmStock.title }) {
  if (!show || !payload) return null;

  const rows = [
    [confirmStockLabels.glassType, payload.glassType],
    [confirmStockLabels.thickness, payload.thickness != null ? `${payload.thickness} mm` : null],
    [confirmStockLabels.height, payload.height != null ? `${payload.height} ${(payload.unit || 'mm').toLowerCase()}` : null],
    [confirmStockLabels.width, payload.width != null ? `${payload.width} ${(payload.unit || 'mm').toLowerCase()}` : null],
    [confirmStockLabels.stand, payload.standNo != null ? `Rack ${payload.standNo}` : null],
    [confirmStockLabels.quantity, payload.quantity],
    [confirmStockLabels.action, payload.action ? formatAuditAction(payload.action) : null],
  ].filter(([, v]) => v != null && v !== '');

  return (
    <Modal
      open={show}
      onClose={onCancel}
      title={title}
      description={confirmStock.description}
      size="sm"
      footer={
        <ModalActions
          onCancel={onCancel}
          onConfirm={onConfirm}
          cancelLabel={actions.cancel}
          confirmLabel={confirmStock.confirm}
          confirmVariant="success"
        />
      }
    >
      <dl className="space-y-3">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex justify-between gap-4 py-2 border-b border-slate-100 dark:border-zinc-800 last:border-0"
          >
            <dt className={type.caption}>{label}</dt>
            <dd className={cn(type.tableCellStrong, 'text-right')}>{value}</dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}

export default ConfirmModal;

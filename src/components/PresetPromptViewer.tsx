import { useState, useMemo } from 'react';
import { X, Search, Check, Square, CheckSquare, Zap } from 'lucide-react';
import { useStore } from '../store';
import { useT } from '../i18n/useLocale';
import type { PresetPromptEntry } from '../types/card';
import { getAllPrompts, buildInjectionContent } from '../utils/presetParser';

interface Props {
  onClose: () => void;
}

const ROLE_COLORS: Record<string, string> = {
  system: '#6366f1',
  user: '#22c55e',
  assistant: '#f59e0b',
};

export default function PresetPromptViewer({ onClose }: Props) {
  const t = useT();
  const { activePreset, card, updateCard, addToast } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const allPrompts = useMemo(() => {
    if (!activePreset) return [];
    return getAllPrompts(activePreset.preset);
  }, [activePreset]);

  const filteredPrompts = useMemo(() => {
    return allPrompts.filter(p => {
      if (roleFilter !== 'all' && p.role !== roleFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.content.toLowerCase().includes(q);
      }
      return true;
    });
  }, [allPrompts, roleFilter, searchQuery]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredPrompts.map(p => p.identifier)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleInject = () => {
    if (!card || selectedIds.size === 0) return;

    const selected = allPrompts.filter(p => selectedIds.has(p.identifier));
    const systemPrompts = selected.filter(p => p.system_prompt);
    const otherPrompts = selected.filter(p => !p.system_prompt);

    const updatedCard = JSON.parse(JSON.stringify(card));
    if (!updatedCard.data) updatedCard.data = {};

    // Inject system_prompt flagged prompts into card.data.system_prompt
    if (systemPrompts.length > 0) {
      const content = buildInjectionContent(systemPrompts);
      const existing = updatedCard.data.system_prompt || '';
      updatedCard.data.system_prompt = existing
        ? `${existing}\n\n<!-- ═══ Injected from Preset ═══ -->\n${content}`
        : content;
    }

    // Inject other prompts into card.data.post_history_instructions
    if (otherPrompts.length > 0) {
      const content = buildInjectionContent(otherPrompts);
      const existing = updatedCard.data.post_history_instructions || '';
      updatedCard.data.post_history_instructions = existing
        ? `${existing}\n\n<!-- ═══ Injected from Preset ═══ -->\n${content}`
        : content;
    }

    updateCard(updatedCard);
    addToast('success', t.presetInjectSuccess.replace('{count}', String(selected.length)));
  };

  if (!activePreset) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '900px',
        maxHeight: '90vh',
        background: 'var(--bg-primary)',
        borderRadius: 'var(--radius-lg, 12px)',
        border: '1px solid var(--border-default)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              {t.presetPromptChain}: "{activePreset.name}"
            </h2>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              {t.presetSummary
                .replace('{enabled}', String(allPrompts.filter(p => p.enabled).length))
                .replace('{total}', String(allPrompts.length))}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              transition: 'all 0.15s',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Toolbar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          flexWrap: 'wrap',
        }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '150px' }}>
            <Search size={13} style={{
              position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }} />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t.search}
              style={{
                width: '100%',
                padding: '6px 8px 6px 28px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontSize: '0.75rem',
                outline: 'none',
              }}
            />
          </div>
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            style={{
              padding: '6px 8px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Roles</option>
            <option value="system">System</option>
            <option value="user">User</option>
            <option value="assistant">Assistant</option>
          </select>
          <button onClick={selectAll} style={toolBtnStyle} title={t.presetSelectAll}>
            <CheckSquare size={13} /> {t.presetSelectAll}
          </button>
          <button onClick={deselectAll} style={toolBtnStyle} title={t.presetDeselectAll}>
            <Square size={13} /> {t.presetDeselectAll}
          </button>
        </div>

        {/* Prompt List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
          {filteredPrompts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              {t.presetNoPrompts}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {filteredPrompts.map((prompt, idx) => (
                <PromptCard
                  key={prompt.identifier}
                  prompt={prompt}
                  index={idx}
                  isSelected={selectedIds.has(prompt.identifier)}
                  isExpanded={expandedId === prompt.identifier}
                  onToggleSelect={() => toggleSelect(prompt.identifier)}
                  onToggleExpand={() => setExpandedId(
                    expandedId === prompt.identifier ? null : prompt.identifier
                  )}
                  t={t}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          borderTop: '1px solid var(--border-subtle)',
          background: 'var(--bg-secondary)',
        }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            {selectedIds.size} selected
          </div>
          <button
            onClick={handleInject}
            disabled={!card || selectedIds.size === 0}
            style={{
              padding: '8px 16px',
              background: card && selectedIds.size > 0 ? '#22c55e' : 'var(--bg-elevated)',
              color: card && selectedIds.size > 0 ? 'white' : 'var(--text-muted)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: card && selectedIds.size > 0 ? 'pointer' : 'not-allowed',
              fontSize: '0.75rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'opacity 0.15s',
            }}
          >
            <Zap size={14} />
            {card ? t.presetInjectSelected : t.presetNoCard}
          </button>
        </div>
      </div>
    </div>
  );
}

const toolBtnStyle: React.CSSProperties = {
  padding: '5px 8px',
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  fontSize: '0.65rem',
  fontWeight: 500,
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
};

function PromptCard({
  prompt,
  index,
  isSelected,
  isExpanded,
  onToggleSelect,
  onToggleExpand,
  t,
}: {
  prompt: PresetPromptEntry;
  index: number;
  isSelected: boolean;
  isExpanded: boolean;
  onToggleSelect: () => void;
  onToggleExpand: () => void;
  t: ReturnType<typeof useT>;
}) {
  const roleColor = ROLE_COLORS[prompt.role] || '#888';
  const previewText = prompt.content.slice(0, 120).replace(/\n/g, ' ');

  return (
    <div style={{
      border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      background: isSelected ? 'rgba(99, 102, 241, 0.03)' : 'var(--bg-elevated)',
      transition: 'all 0.15s',
    }}>
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          cursor: 'pointer',
        }}
        onClick={onToggleExpand}
      >
        {/* Checkbox */}
        <button
          onClick={e => { e.stopPropagation(); onToggleSelect(); }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px',
            color: isSelected ? 'var(--accent-primary)' : 'var(--text-muted)',
            flexShrink: 0,
          }}
        >
          {isSelected ? <CheckSquare size={15} /> : <Square size={15} />}
        </button>

        {/* Index */}
        <span style={{
          fontSize: '0.6rem',
          color: 'var(--text-muted)',
          fontWeight: 600,
          width: '20px',
          textAlign: 'center',
          flexShrink: 0,
        }}>
          #{index + 1}
        </span>

        {/* Enabled badge */}
        <span style={{
          fontSize: '0.55rem',
          padding: '1px 5px',
          borderRadius: '9999px',
          fontWeight: 600,
          background: prompt.enabled ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: prompt.enabled ? '#22c55e' : '#ef4444',
          flexShrink: 0,
        }}>
          {prompt.enabled ? '✓' : '✗'}
        </span>

        {/* Role badge */}
        <span style={{
          fontSize: '0.55rem',
          padding: '1px 5px',
          borderRadius: '9999px',
          fontWeight: 600,
          background: `${roleColor}15`,
          color: roleColor,
          flexShrink: 0,
          textTransform: 'uppercase',
        }}>
          {prompt.role}
        </span>

        {/* Name */}
        <span style={{
          flex: 1,
          fontSize: '0.75rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {prompt.name || prompt.identifier}
        </span>

        {/* Depth info */}
        {prompt.injection_depth !== undefined && (
          <span style={{
            fontSize: '0.55rem',
            color: 'var(--text-muted)',
            flexShrink: 0,
          }}>
            {t.presetPromptDepth}: {prompt.injection_depth}
          </span>
        )}

        {/* System prompt badge */}
        {prompt.system_prompt && (
          <span style={{
            fontSize: '0.55rem',
            padding: '1px 5px',
            borderRadius: '9999px',
            background: 'rgba(99, 102, 241, 0.1)',
            color: '#6366f1',
            fontWeight: 600,
            flexShrink: 0,
          }}>
            SYS
          </span>
        )}

        <Check size={12} style={{
          color: 'var(--text-muted)',
          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
          flexShrink: 0,
        }} />
      </div>

      {/* Preview (always visible) */}
      {!isExpanded && (
        <div style={{
          padding: '0 12px 8px 52px',
          fontSize: '0.65rem',
          color: 'var(--text-muted)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {previewText}...
        </div>
      )}

      {/* Expanded content */}
      {isExpanded && (
        <div style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '12px',
          maxHeight: '400px',
          overflowY: 'auto',
        }}>
          <pre style={{
            margin: 0,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontSize: '0.7rem',
            lineHeight: 1.5,
            color: 'var(--text-secondary)',
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
            background: 'var(--bg-primary)',
            padding: '10px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
          }}>
            {prompt.content}
          </pre>
        </div>
      )}
    </div>
  );
}

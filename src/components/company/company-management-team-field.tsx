'use client';

import { DeleteOutlined, DownOutlined, PlusOutlined, UpOutlined } from '@ant-design/icons';
import { Button, Form, Input, Select, Space } from 'antd';
import { useMemo, type ReactNode } from 'react';

import { CoverImageField } from '@/components/editorial/cover-image-field';
import {
  type CompanyTeamLevel,
  type CompanyTeamMember,
  emptyCompanyTeamMember,
} from '@/lib/company-profile';

const LEVEL_META: Array<{ level: CompanyTeamLevel; label: string }> = [
  { level: 'executive', label: '高层' },
  { level: 'manager', label: '中层' },
  { level: 'staff', label: '基层' },
];

const LEVEL_RANK: Record<CompanyTeamLevel, number> = {
  executive: 0,
  manager: 1,
  staff: 2,
};

type Props = {
  value?: CompanyTeamMember[];
  onChange?: (value: CompanyTeamMember[]) => void;
};

function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <div className="company-team-member-card__label">
      {children}
      {required ? <span className="company-team-member-card__required">*</span> : null}
    </div>
  );
}

function normalizeTeam(value: CompanyTeamMember[] | undefined): CompanyTeamMember[] {
  return (value ?? []).map((row, index) => ({
    ...emptyCompanyTeamMember(row.level ?? 'staff', index),
    ...row,
    id: row.id || emptyCompanyTeamMember('staff').id,
    sortOrder: Number.isFinite(row.sortOrder) ? row.sortOrder : index,
  }));
}

export function CompanyManagementTeamField({ value, onChange }: Props) {
  const team = useMemo(() => normalizeTeam(value), [value]);

  function commit(next: CompanyTeamMember[]) {
    const ranked = [...next].sort((a, b) => {
      if (LEVEL_RANK[a.level] !== LEVEL_RANK[b.level]) return LEVEL_RANK[a.level] - LEVEL_RANK[b.level];
      return a.sortOrder - b.sortOrder;
    }).map((row, index) => ({ ...row, sortOrder: index }));
    onChange?.(ranked);
  }

  function updateMember(id: string, patch: Partial<CompanyTeamMember>) {
    commit(team.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function addMember(level: CompanyTeamLevel) {
    const sameLevel = team.filter((row) => row.level === level);
    const member = emptyCompanyTeamMember(level, sameLevel.length);
    if (level !== 'executive') {
      const higher = team.filter((row) => LEVEL_RANK[row.level] < LEVEL_RANK[level] && row.name.trim());
      member.supervisorId = higher[0]?.id ?? '';
    }
    commit([...team, member]);
  }

  function removeMember(id: string) {
    commit(
      team
        .filter((row) => row.id !== id)
        .map((row) => (row.supervisorId === id ? { ...row, supervisorId: '' } : row)),
    );
  }

  function moveMember(id: string, direction: -1 | 1) {
    const member = team.find((row) => row.id === id);
    if (!member) return;
    const siblings = team
      .filter((row) => row.level === member.level)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const index = siblings.findIndex((row) => row.id === id);
    const swapWith = siblings[index + direction];
    if (!swapWith) return;
    commit(team.map((row) => {
      if (row.id === member.id) return { ...row, sortOrder: swapWith.sortOrder };
      if (row.id === swapWith.id) return { ...row, sortOrder: member.sortOrder };
      return row;
    }));
  }

  function supervisorOptions(level: CompanyTeamLevel, selfId: string) {
    return team
      .filter((row) => row.id !== selfId && LEVEL_RANK[row.level] < LEVEL_RANK[level] && row.name.trim())
      .map((row) => ({
        value: row.id,
        label: row.title.trim() ? `${row.name} · ${row.title}` : row.name,
      }));
  }

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      {LEVEL_META.map(({ level, label }) => {
        const rows = team
          .filter((row) => row.level === level)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        return (
          <div key={level}>
            <div className="company-team-level-title">{label}</div>
            <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
              {rows.map((member, index) => (
                <div key={member.id} className="company-team-member-card">
                  <div className="company-team-member-card__header">
                    <strong>{label} #{index + 1}</strong>
                    <Space size={0}>
                      <Button
                        type="text"
                        icon={<UpOutlined />}
                        disabled={index === 0}
                        onClick={() => moveMember(member.id, -1)}
                      />
                      <Button
                        type="text"
                        icon={<DownOutlined />}
                        disabled={index === rows.length - 1}
                        onClick={() => moveMember(member.id, 1)}
                      />
                      <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeMember(member.id)} />
                    </Space>
                  </div>
                  <div className="company-team-member-card__body">
                    <div className="company-team-member-card__avatar">
                      <FieldLabel>头像</FieldLabel>
                      <CoverImageField
                        variant="avatar"
                        folder="company/team"
                        value={member.avatarUrl || null}
                        onChange={(url) => updateMember(member.id, { avatarUrl: url ?? '' })}
                      />
                    </div>
                    <div className="company-team-member-card__fields">
                      <div className="company-team-member-card__field">
                        <FieldLabel required>名称</FieldLabel>
                        <Input
                          value={member.name}
                          placeholder="姓名"
                          onChange={(event) => updateMember(member.id, { name: event.target.value })}
                        />
                      </div>
                      <div className="company-team-member-card__field">
                        <FieldLabel>职位</FieldLabel>
                        <Input
                          value={member.title}
                          placeholder="职位"
                          onChange={(event) => updateMember(member.id, { title: event.target.value })}
                        />
                      </div>
                      <div className="company-team-member-card__field">
                        <FieldLabel>邮箱</FieldLabel>
                        <Input
                          value={member.email}
                          placeholder="name@example.com"
                          onChange={(event) => updateMember(member.id, { email: event.target.value })}
                        />
                      </div>
                      <div className="company-team-member-card__field">
                        <FieldLabel>联系方式</FieldLabel>
                        <Input
                          value={member.contact}
                          placeholder="+86 ..."
                          onChange={(event) => updateMember(member.id, { contact: event.target.value })}
                        />
                      </div>
                      <div className={`company-team-member-card__field${level === 'executive' ? ' company-team-member-card__field--span' : ''}`}>
                        <FieldLabel>负责区域</FieldLabel>
                        <Input
                          value={member.region}
                          placeholder="负责区域"
                          onChange={(event) => updateMember(member.id, { region: event.target.value })}
                        />
                      </div>
                      {level !== 'executive' ? (
                        <div className="company-team-member-card__field">
                          <FieldLabel required>上级</FieldLabel>
                          <Select
                            style={{ width: '100%' }}
                            value={member.supervisorId || undefined}
                            placeholder="选择上级"
                            options={supervisorOptions(level, member.id)}
                            onChange={(next) => updateMember(member.id, { supervisorId: next ?? '' })}
                            allowClear={false}
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
              <Button type="dashed" onClick={() => addMember(level)} icon={<PlusOutlined />}>
                添加{label}
              </Button>
            </Space>
          </div>
        );
      })}
    </Space>
  );
}

export function CompanyManagementTeamFormItem() {
  return (
    <Form.Item
      name="managementTeam"
      rules={[
        {
          validator: async (_, value: CompanyTeamMember[] | undefined) => {
            const rows = normalizeTeam(value).filter((row) => row.name.trim() || row.title.trim() || row.email.trim());
            for (const row of rows) {
              if (!row.name.trim()) throw new Error('管理团队名称必填');
              if (row.level !== 'executive' && !row.supervisorId.trim()) {
                throw new Error('中层与基层必须选择上级');
              }
            }
          },
        },
      ]}
    >
      <CompanyManagementTeamField />
    </Form.Item>
  );
}

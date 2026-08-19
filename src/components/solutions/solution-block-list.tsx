'use client';

import { DeleteOutlined, DownOutlined, EditOutlined, PlusOutlined, UpOutlined } from '@ant-design/icons';
import { Button, Empty, Form, Modal, Select, Space, Typography } from 'antd';
import { useState } from 'react';

import {
  solutionBlockTypeLabels,
  solutionBlockTypes,
  createSolutionBlock,
  getSolutionBlockLabel,
  type SolutionBlockDraft,
  type SolutionBlockType,
} from '@/lib/solution-blocks';

type AddFormValues = {
  type: SolutionBlockType;
};

type SolutionBlockListProps = {
  blocks: SolutionBlockDraft[];
  onChange: (blocks: SolutionBlockDraft[]) => void;
  onEdit: (block: SolutionBlockDraft) => void;
};

export function SolutionBlockList({ blocks, onChange, onEdit }: SolutionBlockListProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [form] = Form.useForm<AddFormValues>();

  function moveBlock(index: number, offset: number) {
    const nextIndex = index + offset;
    if (nextIndex < 0 || nextIndex >= blocks.length) return;
    const next = [...blocks];
    const [item] = next.splice(index, 1);
    next.splice(nextIndex, 0, item);
    onChange(next);
  }

  function removeBlock(id: string) {
    onChange(blocks.filter((block) => block.id !== id));
  }

  function submitAdd() {
    form.validateFields().then((values) => {
      onChange([...blocks, createSolutionBlock(values.type)]);
      setAddOpen(false);
      form.resetFields();
    });
  }

  return (
    <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <Typography.Text strong>内容区块</Typography.Text>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>
          添加区块
        </Button>
      </div>

      {blocks.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="尚未添加内容区块" />
      ) : (
        <Space orientation="vertical" size="small" style={{ width: '100%' }}>
          {blocks.map((block, index) => (
            <div
              key={block.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '10px 12px',
                border: '1px solid #f0f0f0',
                borderRadius: 8,
                background: '#fff',
              }}
            >
              <Typography.Text>{getSolutionBlockLabel(block)}</Typography.Text>
              <Space size={4}>
                <Button
                  type="text"
                  size="small"
                  icon={<UpOutlined />}
                  disabled={index === 0}
                  onClick={() => moveBlock(index, -1)}
                />
                <Button
                  type="text"
                  size="small"
                  icon={<DownOutlined />}
                  disabled={index === blocks.length - 1}
                  onClick={() => moveBlock(index, 1)}
                />
                <Button type="text" size="small" icon={<EditOutlined />} onClick={() => onEdit(block)}>
                  编辑
                </Button>
                <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => removeBlock(block.id)} />
              </Space>
            </div>
          ))}
        </Space>
      )}

      <Modal
        title="添加内容区块"
        open={addOpen}
        onCancel={() => {
          setAddOpen(false);
          form.resetFields();
        }}
        onOk={submitAdd}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" initialValues={{ type: 'split' }}>
          <Form.Item name="type" label="区块类型" rules={[{ required: true, message: '请选择区块类型' }]}>
            <Select
              options={solutionBlockTypes.map((type) => ({
                value: type,
                label: solutionBlockTypeLabels[type],
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}

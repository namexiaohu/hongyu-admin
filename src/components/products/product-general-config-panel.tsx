'use client';

import { Col, Form, Input, Row, Switch } from 'antd';

import { BrandPickerField } from '@/components/brands/brand-picker-field';
import { CategoryPickerField } from '@/components/categories/category-picker-field';
import { ProductBoardMultiSelect, type ProductBoardOption } from '@/components/products/product-board-multi-select';
import type { AdminCategoryTreeNode } from '@/lib/category-content';
import type { ProductStatus } from '@/lib/product-content';

type ProductGeneralConfigPanelProps = {
  spu: string;
  onSpuChange: (value: string) => void;
  categoryTree: AdminCategoryTreeNode[];
  categoryIds: string[];
  onCategoryIdsChange: (value: string[]) => void;
  brandId: string | null;
  onBrandIdChange: (value: string | null) => void;
  boardOptions: ProductBoardOption[];
  boardKeys: string[];
  onBoardKeysChange: (value: string[]) => void;
  status: ProductStatus;
  onStatusChange: (nextStatus: ProductStatus) => void;
};

const fieldStyle = { marginBottom: 16 };

export function ProductGeneralConfigPanel({
  spu,
  onSpuChange,
  categoryTree,
  categoryIds,
  onCategoryIdsChange,
  brandId,
  onBrandIdChange,
  boardOptions,
  boardKeys,
  onBoardKeysChange,
  status,
  onStatusChange,
}: ProductGeneralConfigPanelProps) {
  return (
    <div className="content-editor-shared-section">
      <Row gutter={[16, 0]}>
        <Col xs={24} md={6}>
          <Form.Item label="SPU" layout="vertical" required style={fieldStyle}>
            <Input value={spu} onChange={(event) => onSpuChange(event.target.value)} placeholder="全局唯一 SPU" />
          </Form.Item>
        </Col>
        <Col xs={24} md={6}>
          <Form.Item label="所属分类" layout="vertical" required style={fieldStyle}>
            <CategoryPickerField
              mode="multiple"
              categoryTree={categoryTree}
              value={categoryIds}
              onChange={onCategoryIdsChange}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={6}>
          <Form.Item label="所属品牌" layout="vertical" required style={fieldStyle}>
            <BrandPickerField
              mode="single"
              value={brandId ?? ''}
              onChange={(value) => onBrandIdChange(value || null)}
              addButtonLabel="选择品牌"
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={6}>
          <Form.Item label="看板关联" layout="vertical" style={fieldStyle}>
            <ProductBoardMultiSelect
              boards={boardOptions}
              value={boardKeys}
              onChange={onBoardKeysChange}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={6}>
          <Form.Item label="上架状态" layout="vertical" style={fieldStyle}>
            <Switch
              checked={status === 'active'}
              checkedChildren="上架"
              unCheckedChildren="下架"
              onChange={(checked) => onStatusChange(checked ? 'active' : 'inactive')}
            />
          </Form.Item>
        </Col>
      </Row>
    </div>
  );
}

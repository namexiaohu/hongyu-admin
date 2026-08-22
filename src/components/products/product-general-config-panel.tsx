'use client';

import { Col, Form, Input, Row, Switch } from 'antd';

import { BrandPickerField } from '@/components/brands/brand-picker-field';
import { CategoryPickerField } from '@/components/categories/category-picker-field';
import {
  PartnerCenterBackgroundField,
  type PartnerCenterBackgroundValue,
} from '@/components/partner-centers/partner-center-background-field';
import {
  CoverOptionField,
  type CoverOptionValue,
} from '@/components/shared/cover-option-field';
import { HeroCopyStyleField } from '@/components/shared/hero-copy-style-field';
import type { HeroCopyStyle } from '@/lib/hero-copy-style';
import { ProductBoardMultiSelect, type ProductBoardOption } from '@/components/products/product-board-multi-select';
import { ProductGalleryField } from '@/components/products/product-gallery-field';
import { ProductVideoField } from '@/components/products/product-video-field';
import type { AdminCategoryTreeNode } from '@/lib/category-content';
import type { AdminProductPayload, ProductStatus } from '@/lib/product-content';

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
  cover: CoverOptionValue;
  onCoverChange: (value: CoverOptionValue) => void;
  gallery: AdminProductPayload['gallery'];
  onGalleryChange: (value: AdminProductPayload['gallery']) => void;
  videoUrl: string;
  onVideoUrlChange: (value: string) => void;
  background: PartnerCenterBackgroundValue;
  onBackgroundChange: (value: PartnerCenterBackgroundValue) => void;
  showCoverOnBackground: boolean;
  onShowCoverOnBackgroundChange: (value: boolean) => void;
  heroCopyStyle: HeroCopyStyle;
  onHeroCopyStyleChange: (value: HeroCopyStyle) => void;
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
  cover,
  onCoverChange,
  gallery,
  onGalleryChange,
  videoUrl,
  onVideoUrlChange,
  background,
  onBackgroundChange,
  showCoverOnBackground,
  onShowCoverOnBackgroundChange,
  heroCopyStyle,
  onHeroCopyStyleChange,
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

      <Form.Item label="封面图" layout="vertical" style={fieldStyle}>
        <CoverOptionField value={cover} onChange={onCoverChange} />
      </Form.Item>
      <Form.Item label="轮播图" layout="vertical" style={fieldStyle}>
        <ProductGalleryField value={gallery} onChange={(value) => onGalleryChange(value ?? [])} />
      </Form.Item>
      <Form.Item label="视频" layout="vertical" style={fieldStyle}>
        <ProductVideoField
          folder="products/videos"
          value={videoUrl || null}
          onChange={(value) => onVideoUrlChange(value ?? '')}
        />
      </Form.Item>
      <Form.Item
        label="大背景图同时显示封面"
        layout="vertical"
        style={fieldStyle}
        extra="开启后，详情页看板在大背景图右侧同时展示封面"
      >
        <Switch
          checked={showCoverOnBackground}
          checkedChildren="开"
          unCheckedChildren="关"
          onChange={onShowCoverOnBackgroundChange}
        />
      </Form.Item>
      <Form.Item label="看板文案风格" layout="vertical" style={fieldStyle}>
        <HeroCopyStyleField value={heroCopyStyle} onChange={onHeroCopyStyleChange} />
      </Form.Item>
      <Form.Item label="大背景图" layout="vertical" style={fieldStyle}>
        <PartnerCenterBackgroundField
          value={background}
          onChange={onBackgroundChange}
        />
      </Form.Item>
    </div>
  );
}

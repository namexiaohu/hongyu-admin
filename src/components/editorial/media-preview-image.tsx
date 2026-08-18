'use client';

import { Image } from 'antd';

type MediaPreviewImageProps = {
  src: string;
  alt?: string;
};

export function MediaPreviewImage({ src, alt = '' }: MediaPreviewImageProps) {
  return (
    <div className="media-preview-thumb">
      <Image src={src} alt={alt} preview={{ mask: '预览' }} />
    </div>
  );
}

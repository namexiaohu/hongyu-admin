'use client';

import { Image } from 'antd';

type MediaPreviewImageProps = {
  src: string;
  alt?: string;
  className?: string;
};

export function MediaPreviewImage({ src, alt = '', className }: MediaPreviewImageProps) {
  return (
    <div className={['media-preview-thumb', className].filter(Boolean).join(' ')}>
      <Image src={src} alt={alt} preview={{ mask: '预览' }} />
    </div>
  );
}

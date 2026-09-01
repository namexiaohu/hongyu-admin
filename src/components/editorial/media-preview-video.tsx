'use client';

import { PlayCircleOutlined } from '@ant-design/icons';
import { Modal } from 'antd';
import { useState } from 'react';

type MediaPreviewVideoProps = {
  src: string;
  className?: string;
};

export function MediaPreviewVideo({ src, className }: MediaPreviewVideoProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={['media-preview-thumb media-preview-video-thumb', className].filter(Boolean).join(' ')}
        onClick={() => setOpen(true)}
        aria-label="预览视频"
      >
        <video src={src} muted playsInline preload="metadata" />
        <span className="media-preview-video-mask">
          <PlayCircleOutlined />
          预览
        </span>
      </button>
      <Modal
        open={open}
        title="视频预览"
        footer={null}
        centered
        width={880}
        destroyOnHidden
        onCancel={() => setOpen(false)}
      >
        {open ? (
          <video
            src={src}
            controls
            autoPlay
            playsInline
            style={{ width: '100%', maxHeight: '70vh', background: '#000', borderRadius: 8 }}
          />
        ) : null}
      </Modal>
    </>
  );
}

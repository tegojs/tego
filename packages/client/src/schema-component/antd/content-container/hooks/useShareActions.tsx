import { useEffect, useRef, useState } from 'react';
import { useFieldSchema } from '@tachybase/schema';

import { Button, message } from 'antd';
import QRCode from 'qrcode';
import { useTranslation } from 'react-i18next';
import { useMatch } from 'react-router';

import { useIsMobile } from '../../../../block-provider';
import { useCompile } from '../../../../schema-component';
import { useCurrentUserVariable } from '../../../../schema-settings';

export const useShareActions = ({ title, uid }) => {
  const fieldSchema = useFieldSchema();
  const isAdmin = useMatch('/admin/:name');
  const isShare = useMatch('/share/:name');
  const isMobile = useMatch('/mobile/:name');
  const isMobilePage = useIsMobile();
  const currentRoute = isAdmin || isShare || isMobile;
  const replaceLink = isMobilePage
    ? window.location.href.replace('/mobile', '/share')
    : window.location.href.replace('/admin', '/share');
  const link = replaceLink
    .replace(currentRoute?.params?.name, uid || fieldSchema['x-uid'])
    .replace(window.location.search || '', '');
  const { t } = useTranslation();
  const [qrLink, setQrLink] = useState<string | undefined>();
  const compile = useCompile();
  QRCode.toDataURL(link, { width: 170 }, (err, url) => {
    if (err) {
      console.error(err);
      return;
    }
    if (!qrLink) {
      setQrLink(url);
    }
  });
  const copyLink = () => {
    navigator.clipboard.writeText(link).then((res) => {
      message.open({
        type: 'success',
        content: (
          <>
            {t('Replicated')}
            <span style={{ color: '#3279FE' }}>{compile(title || '')}</span>
            {t('page link')}
          </>
        ),
      });
    });
  };

  const imageAction = () => {
    return <ImageModal link={qrLink} title={title} />;
  };
  return {
    copyLink,
    imageAction,
  };
};

const ImageModal = (props) => {
  const { link, title } = props;
  const canvasRef = useRef(null);
  const { t } = useTranslation();
  const { currentUserCtx } = useCurrentUserVariable();
  const compile = useCompile();
  useEffect(() => {
    canvasContent(canvasRef, link, currentUserCtx, t);
  }, []);

  const saveImage = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const imageData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imageData;
      link.download = 'Tachybase-Share.png';
      link.click();
      message.open({
        type: 'success',
        content: (
          <>
            {t('Saved')}
            <span style={{ color: '#3279FE' }}>{compile(title || '')}</span>
            {t('QR code')}
          </>
        ),
      });
    }
  };

  const copyImage = () => {
    const canvas = canvasRef.current;
    if (canvas && navigator.clipboard) {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          message.open({
            type: 'success',
            content: (
              <>
                {t('Replicated')}
                <span style={{ color: '#3279FE' }}>{compile(title || '')}</span>
                {t('QR code')}
              </>
            ),
          });
        } catch (err) {
          message.error(t('Copy failed, please try again'));
        }
      }, 'image/png');
    }
  };

  return (
    <div
      style={{
        marginTop: '23px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <canvas
        ref={canvasRef}
        width={240}
        height={260}
        style={{
          width: '240px',
          height: '260px',
          pointerEvents: 'none',
        }}
      />
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', marginTop: '10px', gap: '15px' }}>
        <Button onClick={saveImage} style={{ flex: 1 }}>
          {t('Save Picture')}
        </Button>
        <Button onClick={copyImage} style={{ flex: 1 }}>
          {t('Copy QR code')}
        </Button>
      </div>
    </div>
  );
};

const canvasContent = (canvasRef, link, currentUserCtx, t) => {
  const canvas = canvasRef.current;
  const ctx = canvas.getContext('2d');

  const dpr = window.devicePixelRatio;
  const { width, height } = canvas;
  // 重新设置 canvas 自身宽高大小和 css 大小。放大 canvas；css 保持不变
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  // 直接用 scale 放大整个坐标系，相对来说就是放大了每个绘制操作
  ctx.scale(dpr, dpr);

  ctx.filter = 'blur(20px)';
  const backgroundGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  backgroundGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  backgroundGradient.addColorStop(1, 'rgba(234, 238, 246, 0.80)');
  ctx.fillStyle = backgroundGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 绘制两个模糊的 radial 光斑
  const drawGlow = (x, y) => {
    const radius = 100;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(1, 'rgba(217, 238, 255, 0.216)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  };

  drawGlow(60, 30); // ::before
  drawGlow(190, 280); // ::after

  // 清除 filter，以防后续绘图受影响
  ctx.filter = 'none';

  ctx.fillStyle = '#AAAAAA';
  ctx.font = '13px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`${currentUserCtx.nickname}`, canvas.width / 4, 30);

  const img = new Image();
  img.src = link;
  img.onload = () => {
    const imgWidth = img.width;
    const imgHeight = img.height;
    const x = (canvas.width - imgWidth) / 8;
    const y = 40;
    // 设置边框和圆角
    const borderWidth = 3; // 边框宽度
    const borderRadius = 20; // 圆角半径

    ctx.beginPath();
    ctx.moveTo(x + borderRadius, y); // 从圆角开始绘制
    ctx.arcTo(x + imgWidth, y, x + imgWidth, y + imgHeight, borderRadius); // 右上角圆角
    ctx.arcTo(x + imgWidth, y + imgHeight, x, y + imgHeight, borderRadius); // 右下角圆角
    ctx.arcTo(x, y + imgHeight, x, y, borderRadius); // 左下角圆角
    ctx.arcTo(x, y, x + imgWidth, y, borderRadius); // 左上角圆角
    ctx.closePath();

    // 设置裁剪区域
    ctx.clip();
    ctx.drawImage(img, x + borderWidth, y + borderWidth, imgWidth - 2 * borderWidth, imgHeight - 2 * borderWidth);

    ctx.lineWidth = borderWidth; // 边框宽度
    ctx.strokeStyle = '#000'; // 边框颜色
    ctx.beginPath();
    ctx.moveTo(x + borderRadius, y); // 从圆角开始绘制
    ctx.arcTo(x + imgWidth, y, x + imgWidth, y + imgHeight, borderRadius); // 右上角圆角
    ctx.arcTo(x + imgWidth, y + imgHeight, x, y + imgHeight, borderRadius); // 右下角圆角
    ctx.arcTo(x, y + imgHeight, x, y, borderRadius); // 左下角圆角
    ctx.arcTo(x, y, x + imgWidth, y, borderRadius); // 左上角圆角
    ctx.closePath();
    ctx.stroke(); // 绘制边框
  };

  ctx.fillStyle = '#AAAAAA';
  ctx.font = '13px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(t('Scan the code to view the sharing'), canvas.width / 4, 230);

  ctx.fillStyle = 'rgba(50, 121, 254, 1)';
  ctx.font = '14px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('灵矶(Tachybase)', canvas.width / 4, 250);
};

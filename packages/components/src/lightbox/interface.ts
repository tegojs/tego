export interface IReactImageLightboxProps {
  enableZoom: boolean;
  // animationDisabled: boolean;
  // clickOutsideToClose: boolean;
  // imageCountSeparator: string;
  keyRepeatKeyupBonus?: number;
  prevSrc: string;
  nextSrc: string;
  // mainSrc: string;
  keyRepeatLimit?: number;
  animationDisabled: any;
  animationDuration?: any;
  clickOutsideToClose: any;
  discourageDownloads?: any;
  imageTitle?: any;
  mainFile?: any;
  nextFile?: any;
  prevFile?: any;
  previewList?: any;
  toolbarButtons: any;
  reactModalStyle: any;
  onAfterOpen?: any;
  imageCrossOrigin?: any;
  reactModalProps?: any;
  loader?: any;
  animationOnKeyInput?: any;
  wrapperClassName?: any;
  onImageLoadError: Function;
  onImageLoad: Function;
  onCloseRequest: Function;
  onMovePrevRequest: Function;
  onMoveNextRequest: Function;
  prevLabel?: string;
  nextLabel?: string;
  zoomInLabel?: string;
  zoomOutLabel?: string;
  closeLabel?: string;
  imageCaption?: any;
  otherProps?: any;
}

export interface IReactImageLightboxState {
  zoomLevel: number;
  offsetX: number;
  offsetY: number;
  isClosing?: boolean;
  shouldAnimate?: boolean;
  loadErrorStatus?: {};
}

import { Animation } from '@ionic/core';

export const EnterAnimation = (AnimationInstance: Animation, baseEl: HTMLElement): Promise<Animation> => {

  const baseAnimation: Animation = new AnimationInstance();
  const backdropAnimation: Animation = new AnimationInstance();
  const wrapperAnimation: Animation = new AnimationInstance();

  backdropAnimation.addElement(baseEl.querySelector('ion-backdrop'));
  wrapperAnimation.addElement(baseEl.querySelector('.modal-wrapper'));
  wrapperAnimation.beforeStyles({ 'opacity': 1 }).fromTo('translateY', '100%', '0%');
  backdropAnimation.fromTo('opacity', 0.01, 0.4);

  return Promise.resolve(
    baseAnimation
      .addElement(baseEl)
      .easing('cubic-bezier(0.36,0.66,0.04,1)')
      .duration(700)
      .beforeAddClass('show-modal')
      .add(backdropAnimation)
      .add(wrapperAnimation)
  );
};

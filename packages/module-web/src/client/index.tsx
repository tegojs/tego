import React from 'react';
import { createRouterManager, Plugin, RouterManager } from '@tachybase/client';

import { Navigate } from 'react-router-dom';

import PluginCalculator from './assistant-tool/calculator/plugin';
import PluginDesignableButton from './assistant-tool/Designable/plugin';
import PluginSearchAndJump from './assistant-tool/search-and-jump/plugin';
import {
  ImageSearchConfigureFields,
  ImageSearchItemFieldSettings,
  mBlockInitializers,
  SwiperFieldSettings,
  SwiperPage,
  TabSearchFieldSchemaInitializer,
  TabSearchItemFieldSettings,
} from './core/schema';
import { MAppNotFound } from './MAppNotFound';
import { MobileClientProvider } from './MobileClientProvider';
import { MobileLinkProvider } from './MobileLinkProvider';
import { PluginDataSelect } from './plugin-data-select/PluginDataSelect';
import MApplication from './router/Application';

export class ModuleWeb extends Plugin {
  public mobileRouter: RouterManager;

  async afterAdd() {
    this.pm.add(PluginDataSelect, { name: 'plugin-data-select' });
    this.app.pm.add(PluginSearchAndJump, { name: 'SearchAndJump' });
    this.app.pm.add(PluginDesignableButton, { name: 'Designable' });
    this.app.pm.add(PluginCalculator, { name: 'calculator' });
  }
  async load() {
    this.setMobileRouter();
    this.addRoutes();
    this.app.use(MobileClientProvider);
    this.app.use(MobileLinkProvider);
    this.app.schemaInitializerManager.add(mBlockInitializers);
    this.app.schemaInitializerManager.add(ImageSearchConfigureFields);
    this.app.schemaInitializerManager.add(TabSearchFieldSchemaInitializer);

    this.app.schemaSettingsManager.add(SwiperFieldSettings);
    this.app.schemaSettingsManager.add(ImageSearchItemFieldSettings);
    this.app.schemaSettingsManager.add(TabSearchItemFieldSettings);
  }

  setMobileRouter() {
    const router = createRouterManager({ type: 'hash' }, this.app);
    this.router.add('not-found', {
      path: '*',
      Component: MAppNotFound,
    });
    router.add('root', {
      path: '/',
      element: <Navigate replace to="/mobile" />,
    });
    router.add('mobile', {
      path: '/mobile',
      element: <MApplication />,
    });
    router.add('mobile.page', {
      path: '/mobile/:name',
      Component: 'RouteSchemaComponent',
    });
    this.mobileRouter = router;
  }

  getMobileRouterComponent() {
    return this.mobileRouter.getRouterComponent();
  }

  addRoutes() {
    this.app.router.add('mobile', {
      path: '/mobile',
      element: <MApplication />,
    });
    this.app.router.add('mobile.page', {
      path: '/mobile/:name',
      Component: 'RouteSchemaComponent',
    });
    this.app.router.add('mobile.swiper.page', {
      path: '/mobile/:name/image/:collection/:field/:fieldParams',
      Component: SwiperPage,
    });
  }
}

export default ModuleWeb;

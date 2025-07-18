import React, { useCallback, useMemo } from 'react';

import { Layout, Menu, Result } from 'antd';
import { Navigate, Outlet, useLocation, useNavigate, useParams } from 'react-router';

import { PluginSettingsPageType, useApp } from '../../application';
import { USER_SETTINGS_PATH, UserSettingsPageType } from '../../application/UserSettingsManager';
import { PageHeader, useCompile } from '../../schema-component';
import { useStyles } from './style';

function getMenuItems(list: PluginSettingsPageType[]) {
  return list.map((item) => {
    return {
      key: item.name,
      label: item.label,
      title: item.title,
      icon: item.icon,
      children: item.children?.length ? getMenuItems(item.children) : undefined,
    };
  });
}

function matchRoute(data, url) {
  const keys = Object.keys(data);
  if (data[url]) {
    return data[url];
  }
  for (const pattern of keys) {
    const regexPattern = pattern.replace(/:[^/]+/g, '([^/]+)');
    const match = url.match(new RegExp(`^${regexPattern}$`));

    if (match) {
      return data[pattern];
    }
  }

  return null;
}

function replaceRouteParams(urlTemplate, params) {
  // 使用正则表达式替换占位符
  return urlTemplate.replace(/:\w+/g, (match) => {
    const paramName = match.substring(1);
    return params?.[paramName] || match;
  });
}

export const UserSettingsLayout = () => {
  const { styles, theme } = useStyles();
  const app = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const compile = useCompile();
  const settings = useMemo(() => {
    const list = app.userSettingsManager.getList();
    // compile title
    function traverse(settings: UserSettingsPageType[]) {
      settings.forEach((item) => {
        item.title = compile(item.title);
        item.label = compile(item.title);
        if (item.children?.length) {
          traverse(item.children);
        }
      });
    }
    traverse(list);
    return list;
  }, [app.userSettingsManager, compile]);
  const getFirstDeepChildPath = useCallback((settings: UserSettingsPageType[]) => {
    if (!settings || !settings.length) {
      return `/${app.prefix}`;
    }
    const first = settings[0];
    if (first.children?.length) {
      return getFirstDeepChildPath(first.children);
    }
    return first.path;
  }, []);

  const settingsMapByPath = useMemo<Record<string, UserSettingsPageType>>(() => {
    const map = {};
    const traverse = (settings: UserSettingsPageType[]) => {
      settings.forEach((item) => {
        map[item.path] = item;
        if (item.children?.length) {
          traverse(item.children);
        }
      });
    };
    traverse(settings);
    return map;
  }, [settings]);
  const currentSetting = useMemo(
    () => matchRoute(settingsMapByPath, location.pathname),
    [location.pathname, settingsMapByPath],
  );
  const currentTopLevelSetting = useMemo(() => {
    if (!currentSetting) {
      return null;
    }
    return settings.find((item) => item.name === currentSetting.topLevelName);
  }, [currentSetting, settings]);
  const sidebarMenus = useMemo(() => {
    return getMenuItems(settings.filter((v) => v.isTopLevel !== false).map((item) => ({ ...item, children: null })));
  }, [settings]);
  if (!currentSetting || location.pathname === USER_SETTINGS_PATH || location.pathname === USER_SETTINGS_PATH + '/') {
    return <Navigate replace to={getFirstDeepChildPath(settings)} />;
  }
  if (location.pathname === currentTopLevelSetting.path && currentTopLevelSetting.children?.length > 0) {
    return <Navigate replace to={getFirstDeepChildPath(currentTopLevelSetting.children)} />;
  }
  return (
    <div>
      <Layout>
        <Layout.Sider theme={'light'}>
          <Menu
            selectedKeys={[currentSetting?.pluginKey || currentSetting.topLevelName]}
            style={{ height: 'calc(100vh - 46px)', overflowY: 'auto', overflowX: 'hidden' }}
            onClick={({ key }) => {
              const plugin = settings.find((item) => item.name === key);
              if (plugin.children?.length) {
                return navigate(getFirstDeepChildPath(plugin.children));
              } else {
                return navigate(plugin.path);
              }
            }}
            items={sidebarMenus}
          />
        </Layout.Sider>
        <Layout.Content>
          {currentSetting && (
            <PageHeader
              className={styles.pageHeader}
              style={{
                paddingBottom:
                  currentTopLevelSetting.children?.length > 0 && currentTopLevelSetting.showTabs !== false
                    ? 0
                    : theme.paddingSM,
              }}
              ghost={false}
              title={currentTopLevelSetting.title}
              footer={
                currentTopLevelSetting.children?.length > 0 &&
                currentTopLevelSetting.showTabs !== false && (
                  <Menu
                    style={{ marginLeft: -theme.margin }}
                    onClick={({ key }) => {
                      navigate(replaceRouteParams(app.systemSettingsManager.getRoutePath(key), params));
                    }}
                    selectedKeys={[currentSetting?.name]}
                    mode="horizontal"
                    items={getMenuItems(currentTopLevelSetting.children)}
                  ></Menu>
                )
              }
            />
          )}
          <div className={styles.pageContent}>
            {currentSetting ? (
              <Outlet />
            ) : (
              <Result status="404" title="404" subTitle="Sorry, the page you visited does not exist." />
            )}
          </div>
        </Layout.Content>
      </Layout>
    </div>
  );
};

import React from 'react';
import styled from 'styled-components';
import { Menu, MenuProps } from 'antd';

const StyledMenu = styled(Menu)`
  &&&.ant-menu {
    background-color: transparent;
    border-right: 0;
    border-inline-end: 0 !important;
    color: var(--gray-8);

    &:not(.ant-menu-horizontal) {
      .ant-menu-item-selected {
        color: var(--gray-8);
        background-color: var(--gray-5);
      }
    }

    .ant-menu-item-group {
      margin-top: 20px;

      &:first-child {
        margin-top: 0;
      }
    }

    .ant-menu-item-group-title {
      font-size: 12px;
      font-weight: 700;
      padding: 5px 16px;
    }

    .ant-menu-item {
      line-height: 28px;
      height: 28px;
      margin-top: 0;
      margin-bottom: 0;
      margin-inline: 0;
      padding-top: 0;
      padding-bottom: 0;
      width: 100%;
      border-radius: 0;
      font-weight: 500;

      &:not(.ant-menu-item-disabled):hover {
        color: inherit;
        background-color: var(--gray-4);
      }

      &:not(.ant-menu-item-disabled):active {
        background-color: var(--gray-6);
      }

      &:active {
        background-color: transparent;
      }

      &-selected {
        color: var(--gray-8);

        &:after {
          display: none;
        }

        &:hover {
          color: var(--gray-8);
        }
      }
    }
  }
`;

export default function SidebarMenu({
  items,
  selectedKeys,
  onSelect,
}: MenuProps) {
  return (
    <StyledMenu
      mode="inline"
      items={items}
      selectedKeys={selectedKeys}
      onSelect={onSelect}
    />
  );
}

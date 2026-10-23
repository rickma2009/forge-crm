import { render,screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { SalesActionDialog } from './SalesActionDialog';

describe('SalesActionDialog cancel policy',()=>{
 it.each(['取消','Escape'])('closes directly with %s without an unsaved-content confirmation',async action=>{
  const user=userEvent.setup(),onClose=vi.fn(),confirm=vi.spyOn(window,'confirm');
  render(<SalesActionDialog title="编辑记录" onClose={onClose} onSave={vi.fn(async()=>{})}><label>名称<input defaultValue="已修改" /></label></SalesActionDialog>);
  if(action==='取消')await user.click(screen.getByRole('button',{name:'取消'}));else await user.keyboard('{Escape}');
  expect(onClose).toHaveBeenCalledOnce();
  expect(confirm).not.toHaveBeenCalled();
  confirm.mockRestore();
 });
});

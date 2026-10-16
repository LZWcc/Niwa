type Props = { text: string; action: string; onRequest: () => void };

// 收藏夹、历史还没有权限时的卡片内容：说明要读什么，点按钮申请（浏览器只允许在点击里申请）。
export default function AccessPrompt({ text, action, onRequest }: Props) {
  return (
    <div className="links-access">
      <p>{text}</p>
      <button type="button" className="btn" onClick={onRequest}>
        {action}
      </button>
    </div>
  );
}

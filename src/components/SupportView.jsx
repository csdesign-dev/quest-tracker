import React, { useState } from 'react';
import {
  HelpCircle, ChevronDown, ChevronUp, MessageSquare, Send,
  Info, Trash2, Database, RefreshCw, Mail, AlertTriangle
} from 'lucide-react';

const FAQ_ITEMS = [
  {
    q: 'Як працює система балів?',
    a: 'За кожну виконану задачу ви отримуєте бали. Якщо задача не виконана до кінця дня/тижня/місяця — нараховується штраф. Бонусні задачі дають тільки позитивні бали без штрафів.'
  },
  {
    q: 'Що таке "прогноз"?',
    a: 'Прогноз показує, скільки балів ви отримаєте, якщо не виконаєте жодної задачі до кінця поточного періоду (дня, тижня, місяця). Це мотивує виконувати задачі вчасно.'
  },
  {
    q: 'Як працюють ліміти?',
    a: 'Ліміт — це задача, де потрібно НЕ перевищити кількість. Наприклад, "Алкоголь — макс 2 рази на тиждень". Якщо вкладаєтесь у ліміт — отримуєте бали. Перевищили — штраф.'
  },
  {
    q: 'Чи можна змінити минулі дні?',
    a: 'Так, перейдіть у розділ "Сьогодні" та використайте навігацію по датах щоб повернутись до потрібного дня і скоригувати виконання.'
  },
  {
    q: 'Де зберігаються мої дані?',
    a: 'Наразі всі дані зберігаються локально у вашому браузері (localStorage). Ви можете експортувати/імпортувати дані через JSON файл у бічному меню.'
  },
  {
    q: 'Як перенести дані на інший пристрій?',
    a: 'Використайте функцію "Експорт" щоб зберегти JSON файл, потім на іншому пристрої використайте "Імпорт" щоб завантажити ці дані.'
  },
  {
    q: 'Як працюють бонусні рівні?',
    a: 'Бонусні рівні — це додаткові бали за перевиконання. Наприклад, якщо таргет тренування — 3 рази на тиждень, але ви тренувались 5 разів, ви отримуєте базову винагороду + бонус за досягнення 5-ти разів.'
  },
  {
    q: 'Можна мати декілька профілів?',
    a: 'Так! Кожен користувач може створити свій профіль з окремим набором задач та прогресом. Натисніть на своє ім\'я у бічному меню щоб перемкнути профіль.'
  },
];

function FAQItem({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="faq-item"
      onClick={() => setOpen(!open)}
      style={{ cursor: 'pointer' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ fontWeight: 600, fontSize: 'var(--font-base)' }}>{item.q}</span>
        {open ? <ChevronUp size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
      </div>
      {open && (
        <div style={{
          marginTop: 'var(--space-sm)',
          color: 'var(--text-secondary)',
          fontSize: 'var(--font-sm)',
          lineHeight: 1.6,
          animation: 'fadeIn 200ms ease',
        }}>
          {item.a}
        </div>
      )}
    </div>
  );
}

export default function SupportView() {
  const [feedbackType, setFeedbackType] = useState('suggestion');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackEmail, setFeedbackEmail] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);

  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;

    const accessKey = import.meta.env.VITE_WEB3FORMS_KEY;
    if (!accessKey) {
      setErrorMsg("Ключ Web3Forms не налаштовано. Додайте VITE_WEB3FORMS_KEY у .env");
      return;
    }

    setIsSending(true);
    setErrorMsg('');

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          access_key: accessKey,
          subject: `Quest Tracker Feedback: ${feedbackType}`,
          from_name: "Quest Tracker App",
          email: feedbackEmail.trim() || "no-reply@questtracker.app",
          message: `Тип: ${feedbackType}\nEmail користувача: ${feedbackEmail || 'Не вказано'}\n\nПовідомлення:\n${feedbackText.trim()}`,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setFeedbackSent(true);
        setFeedbackText('');
        setFeedbackEmail('');
        setTimeout(() => setFeedbackSent(false), 3000);
      } else {
        setErrorMsg('Не вдалося відправити повідомлення. Спробуйте пізніше.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Сталася помилка при відправці.');
    } finally {
      setIsSending(false);
    }
  };

  const handleClearCache = () => {
    if (confirm('Це очистить кеш додатку (не видаляючи ваші дані). Продовжити?')) {
      // Clear only non-essential caches
      if ('caches' in window) {
        caches.keys().then(names => names.forEach(name => caches.delete(name)));
      }
      window.location.reload();
    }
  };

  const storageUsed = (() => {
    let total = 0;
    for (const key in localStorage) {
      if (key.startsWith('quest-tracker')) {
        total += (localStorage[key]?.length || 0) * 2; // UTF-16
      }
    }
    return (total / 1024).toFixed(1);
  })();

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h2>
          <HelpCircle size={24} style={{ marginRight: 8, verticalAlign: 'middle' }} />
          Підтримка
        </h2>
        <p>FAQ, зворотній зв'язок та технічна інформація</p>
      </div>

      {/* FAQ Section */}
      <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="card-header">
          <span className="card-title">
            <HelpCircle size={18} style={{ marginRight: 6 }} />
            Часті питання
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {FAQ_ITEMS.map((item, i) => (
            <FAQItem key={i} item={item} />
          ))}
        </div>
      </div>

      {/* Feedback Form */}
      <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="card-header">
          <span className="card-title">
            <MessageSquare size={18} style={{ marginRight: 6 }} />
            Зворотній зв'язок
          </span>
        </div>

        {feedbackSent ? (
          <div className="empty-state" style={{ padding: 'var(--space-lg)' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 'var(--space-md)',
            }}>
              <Send size={24} color="var(--color-success-light)" />
            </div>
            <p style={{ color: 'var(--color-success-light)', fontWeight: 600 }}>Дякуємо за ваш відгук!</p>
            <p style={{ fontSize: 'var(--font-sm)' }}>Ми обов'язково розглянемо ваше повідомлення.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmitFeedback}>
            <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
              <label className="form-label">Тип повідомлення</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { value: 'suggestion', label: '💡 Пропозиція' },
                  { value: 'bug', label: '🐛 Баг' },
                  { value: 'complaint', label: '😤 Скарга' },
                  { value: 'other', label: '📝 Інше' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`btn btn-sm ${feedbackType === opt.value ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setFeedbackType(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
              <label className="form-label">Ваше повідомлення *</label>
              <textarea
                className="form-input"
                rows={4}
                placeholder="Опишіть вашу пропозицію, проблему або скаргу..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                required
                style={{ resize: 'vertical' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
              <label className="form-label">Email (необов'язково)</label>
              <input
                className="form-input"
                type="email"
                placeholder="your@email.com — для зворотнього зв'язку"
                value={feedbackEmail}
                onChange={(e) => setFeedbackEmail(e.target.value)}
              />
            </div>

            {errorMsg && (
              <div style={{ color: 'var(--color-danger)', fontSize: 'var(--font-sm)', marginBottom: 'var(--space-md)' }}>
                {errorMsg}
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={!feedbackText.trim() || isSending}>
              {isSending ? 'Відправка...' : <><Send size={16} /> Надіслати</>}
            </button>
          </form>
        )}
      </div>

      {/* Technical Info */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">
            <Info size={18} style={{ marginRight: 6 }} />
            Технічна інформація
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div className="tech-info-row">
            <div className="tech-info-label">
              <Database size={16} /> Версія додатку
            </div>
            <div className="tech-info-value">1.0.0</div>
          </div>

          <div className="tech-info-row">
            <div className="tech-info-label">
              <Database size={16} /> Використано пам'яті
            </div>
            <div className="tech-info-value">{storageUsed} KB</div>
          </div>

          <div className="tech-info-row">
            <div className="tech-info-label">
              <Info size={16} /> Збереження даних
            </div>
            <div className="tech-info-value">localStorage (локально)</div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-md)' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-secondary btn-sm" onClick={handleClearCache}>
                <RefreshCw size={14} /> Очистити кеш
              </button>
            </div>
          </div>

          <div style={{
            padding: 'var(--space-md)',
            background: 'rgba(251, 146, 60, 0.08)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(251, 146, 60, 0.15)',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: '#fb923c', fontSize: 'var(--font-sm)' }}>
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>
                Дані зберігаються тільки у вашому браузері. Очищення даних браузера видалить всі задачі.
                Регулярно робіть експорт через бічне меню.
              </span>
            </div>
          </div>

          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', textAlign: 'center', marginTop: 'var(--space-sm)' }}>
            <Mail size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Підтримка: crabsstudiodesign@gmail.com
          </div>
        </div>
      </div>
    </div>
  );
}

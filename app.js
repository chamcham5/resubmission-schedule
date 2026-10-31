(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const ids = ['needed', 'asof', 'calendar', 'mode', 'fabrication', 'initial', 'revision', 'reviews', 'holidays'];
  function duration(value) {
    const s = value.trim();
    if (!s) return null;
    if (!/^\d+$/.test(s) || !Number.isSafeInteger(Number(s))) throw new Error('日数は0以上の整数、未知の期間は空欄にしてください。');
    return Number(s);
  }
  function periods(s) { return s.trim() === '[]' ? [] : s.split(',').map(duration); }
  function args() {
    return {needed_on: $('needed').value, as_of: $('asof').value,
      calendar: {mode: $('calendar').value, holidays: $('holidays').value.split(/[,\n]/).map(s => s.trim()).filter(Boolean)},
      fabrication_days: duration($('fabrication').value), initial_reviews: periods($('initial').value),
      revision_days: duration($('revision').value), re_reviews: periods($('reviews').value), review_mode: $('mode').value, revision_counts: [0, 1, 2]};
  }
  function invalidate() {
    $('computed').hidden = true; $('empty').hidden = false; $('empty').textContent = '条件を入れるか、合成例から始めてください。';
    $('rows').replaceChildren(); $('findings').replaceChildren(); $('details').textContent = ''; $('report').value = ''; $('error').hidden = true;
  }
  function node(tag, text) { const n = document.createElement(tag); n.textContent = text; return n; }
  function run(event) {
    event.preventDefault(); invalidate();
    try {
      const input = args(); const out = BusinessCore.execute({tool: 'resubmission_schedule', arguments: input});
      if (out.error) throw new Error(out.error.message + ' (' + out.error.code + ')');
      const unit = input.calendar.mode === 'business_days' ? '営業日' : '暦日';
      const report = ['再提出を含む提出日シナリオ比較', '必要日: ' + input.needed_on, '基準日: ' + input.as_of,
        '日数: ' + unit + ' / 審査: ' + (input.review_mode === 'parallel' ? '並列（最大）' : '直列（合計）'), '再提出回数,所要日数,提出日,基準日からの余裕（暦日）'];
      for (const [count, r] of Object.entries(out.derived.scenarios)) {
        const tr = document.createElement('tr'); if (r.slack_days !== null && r.slack_days < 0) tr.className = 'late';
        const slack = r.slack_days === null ? '未確定' : (r.slack_days > 0 ? '+' : '') + r.slack_days + '日';
        const th = node('th', count + '回'); th.scope = 'row'; tr.append(th);
        [r.total_days === null ? '未確定' : r.total_days + unit, r.planned_submit || '未確定', slack].forEach(s => tr.append(node('td', s)));
        $('rows').append(tr); report.push([count, r.total_days ?? '未確定', r.planned_submit ?? '未確定', r.slack_days ?? '未確定'].join(','));
      }
      out.findings.forEach(f => $('findings').append(node('li', f.message + (f.uncertainty ? ' ' + f.uncertainty : ''))));
      $('result-note').textContent = '入力した条件による3案の比較です。提出日が基準日より前の行は色と数値で示します。';
      $('details').textContent = JSON.stringify({input, result: out}, null, 2);
      $('report').value = report.join('\n') + '\n\n条件と注意：\n' + JSON.stringify(input, null, 2) + '\n納期保証・再提出の発生予測ではありません。';
      $('empty').hidden = true; $('computed').hidden = false;
    } catch (error) { $('error').textContent = error.message; $('error').hidden = false; $('empty').textContent = '入力を直して、もう一度比較してください。'; }
  }
  $('calculator').addEventListener('submit', run);
  ids.forEach(id => $(id).addEventListener('input', invalidate));
  $('example').addEventListener('click', () => {
    invalidate(); const example = {needed:'2026-11-30',asof:'2026-11-01',calendar:'calendar_days',mode:'parallel',fabrication:'10',initial:'5',revision:'3',reviews:'5',holidays:''};
    ids.forEach(id => {$(id).value = example[id];}); $('calculator').requestSubmit(); $('result').scrollIntoView({block:'start'});
  });
  $('clear').addEventListener('click', () => { $('calculator').reset(); invalidate(); $('needed').focus(); });
  $('report').addEventListener('focus', () => $('report').select());
  window.addEventListener('pageshow', () => { $('calculator').reset(); invalidate(); });
})();

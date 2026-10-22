(function ($) {
  'use strict';
  $(function () {
    const KEY = 'fitcalc.weight-log.v1';
    const DAY = 86400000;
    let records = [], period = 7, chart = null;
    const $root = $('#weight-log');
    function localKey(date = new Date()) {
      return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
    }
    // UTC day numbers represent calendar days, avoiding daylight-saving gaps.
    function dayNumber(key) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key || '')) return NaN;
      const [y, m, d] = key.split('-').map(Number);
      const date = new Date(0); date.setUTCFullYear(y, m - 1, d); date.setUTCHours(0, 0, 0, 0);
      return y >= 1000 && date.toISOString().slice(0, 10) === key ? date.getTime() / DAY : NaN;
    }
    function dayKey(n) { return new Date(n * DAY).toISOString().slice(0, 10); }
    function validWeight(raw) {
      return /^\d+(?:\.\d)?$/.test(String(raw)) && Number.isFinite(Number(raw)) && Number(raw) >= 20 && Number(raw) <= 200;
    }
    function sorted() { return records.slice().sort((a, b) => a.date.localeCompare(b.date)); }
    function weight(n) { return n.toFixed(1) + ' kg'; }
    function delta(n) { return (n > 0 ? '+' : '') + weight(n); }
    function tone(n) { return n < 0 ? 'wl-down' : n > 0 ? 'wl-up' : ''; }
    function save() {
      try { localStorage.setItem(KEY, JSON.stringify({version: 1, records, target: $('#wl-target').val()})); $('#wl-storage').text(''); }
      catch (_) { $('#wl-storage').text('브라우저에 저장하지 못했습니다. 현재 화면에서는 사용할 수 있지만 새로고침하면 변경 내용이 사라질 수 있습니다.'); }
    }
    function load() {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw !== null) {
          const data = JSON.parse(raw);
          if (data.version !== 1 || !Array.isArray(data.records)) throw new Error('invalid data');
          if (typeof data.target === 'string' && validWeight(data.target)) $('#wl-target').val(data.target);
          const dates = new Set();
          records = data.records.map(r => {
            if (!r || !Number.isFinite(dayNumber(r.date)) || r.date > localKey() || typeof r.weight !== 'number' || !validWeight(r.weight) || typeof r.note !== 'string' || r.note.length > 80 || typeof r.example !== 'boolean' || dates.has(r.date)) throw new Error('invalid record');
            dates.add(r.date);
            return {date: r.date, weight: r.weight, note: r.note, example: r.example};
          });
          return;
        }
      } catch (_) {
        records = [];
        $('#wl-storage').text('저장된 기록을 읽을 수 없습니다. 빈 목록으로 시작합니다. 새 기록은 현재 화면에서 사용할 수 있습니다.');
        return;
      }
      const today = dayNumber(localKey());
      records = [70, 69.8, 69.9, 69.5, 69.3, 69.1, 68.8].map((value, i) => ({ date: dayKey(today - 6 + i), weight: value, note: '아침 공복', example: true }));
      save();
    }
    function target() { const raw = $('#wl-target').val().trim(); return validWeight(raw) ? Number(raw) : null; }
    function renderChart(list, goal) {
      const end = dayNumber(localKey()), start = end - period + 1;
      const visible = list.filter(r => dayNumber(r.date) >= start && dayNumber(r.date) <= end);
      $('#wl-chart-empty').text(!window.Chart ? '그래프 라이브러리를 불러오지 못했습니다. 기록 표에서 수치를 확인해주세요.' : !visible.length ? '선택한 기간에 기록이 없습니다.' : '');
      if (!window.Chart) return;
      const datasets = [{label: '실제 체중 (kg)', data: visible.map(r => ({x: dayNumber(r.date), y: r.weight})), borderColor: '#15a77e', backgroundColor: '#35c9a522', fill: true, tension: 0.15, pointRadius: 4, pointHoverRadius: 6}];
      if (goal !== null) datasets.push({label: '목표 체중 (kg)', data: [{x: start, y: goal}, {x: end, y: goal}], borderColor: '#2466c5', borderDash: [6, 5], pointRadius: 0, fill: false});
      if (!chart) {
        chart = new Chart(document.getElementById('wl-chart'), {type: 'line', data: {datasets}, options: {
          responsive: true, maintainAspectRatio: false,
          animation: {duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 350},
          scales: {x: {type: 'linear', min: start, max: end, ticks: {stepSize: 1, maxTicksLimit: 7, callback: n => Number.isInteger(n) ? dayKey(n).slice(5).replace('-', '/') : ''}, grid: {display: false}}, y: {title: {display: true, text: '체중 (kg)'}}},
          plugins: {legend: {position: 'bottom', labels: {usePointStyle: true, boxWidth: 8}}, tooltip: {callbacks: {title: items => items.length ? dayKey(items[0].parsed.x) : '', label: item => item.dataset.label + ': ' + weight(item.parsed.y)}}}
        }});
      } else { chart.data.datasets = datasets; chart.options.scales.x.min = start; chart.options.scales.x.max = end; chart.update(); }
    }
    function render() {
      const list = sorted(), first = list[0], latest = list[list.length - 1], goal = target();
      const examples = records.filter(r => r.example).length;
      $('#wl-example').text(examples ? '예시 데이터 ' + examples + '개가 포함되어 있습니다. 실제 기록 전 예시를 지워주세요.' : '나의 실제 체중 기록');
      $('#wl-clear').prop('hidden', !examples);
      $('#wl-current').text(latest ? weight(latest.weight) : '—');
      $('#wl-latest').text(latest ? latest.date + ' 기준' : '첫 기록을 추가해주세요');
      const change = latest ? Math.round((latest.weight - first.weight) * 10) / 10 : 0;
      $('#wl-change').removeClass('wl-up wl-down').addClass(tone(change)).text(latest ? delta(change) : '—');
      $('#wl-baseline').text(latest ? first.date + ' 대비 · ' + (change < 0 ? '감량' : change > 0 ? '증가' : '변화 없음') : '전체 기록 기준');
      let remaining = null, message = '상단에서 유효한 목표 체중을 설정해주세요.';
      if (goal !== null) {
        message = '목표 ' + weight(goal) + (latest ? '' : ' · 체중 기록을 추가해주세요');
        if (latest) {
          const direction = Math.sign(goal - first.weight);
          remaining = direction ? Math.max(0, direction * (goal - latest.weight)) : Math.abs(goal - latest.weight);
          message += remaining < 0.05 ? ' · 목표 달성' : ' · ' + (latest.weight > goal ? '감량' : '증가') + ' 필요';
        }
      }
      $('#wl-remaining').text(remaining === null ? '—' : weight(remaining)); $('#wl-goal').text(message);
      $('#wl-count').text('총 ' + list.length + '개');
      const $rows = $('#wl-rows').empty();
      const lookup = new Map(list.map(r => [r.date, r]));
      list.slice().reverse().forEach(r => {
        const previous = lookup.get(dayKey(dayNumber(r.date) - 1));
        const diff = previous ? Math.round((r.weight - previous.weight) * 10) / 10 : null;
        const $row = $('<tr>');
        $('<td>').text(r.date).appendTo($row); $('<td>').text(weight(r.weight)).appendTo($row);
        $('<td>').addClass(diff === null ? '' : tone(diff)).text(diff === null ? '—' : delta(diff)).appendTo($row);
        $('<td>').text(r.note || '—').appendTo($row);
        $('<td>').append($('<button>', {type: 'button', text: '삭제', 'data-delete': r.date, 'aria-label': r.date + ' 체중 기록 삭제'})).appendTo($row);
        $rows.append($row);
      });
      if (!list.length) $rows.append($('<tr>').append($('<td>', {colspan: 5, text: '아직 기록이 없습니다. 첫 체중을 기록해보세요.'})));
      renderChart(list, goal);
    }
    function error(field, message) { $('#wl-' + field).attr('aria-invalid', 'true'); $('#wl-' + field + '-error').text(message); }
    $('#wl-form').on('submit', function (event) {
      event.preventDefault();
      $root.find('[aria-invalid]').attr('aria-invalid', 'false'); $root.find('.wl-error').text('');
      const date = $('#wl-date').val(), raw = $('#wl-weight').val().trim(), note = $('#wl-note').val().trim();
      if (!Number.isFinite(dayNumber(date)) || date > localKey()) error('date', '오늘 또는 이전의 유효한 날짜를 선택해주세요.');
      if (!validWeight(raw)) error('weight', '20~200kg 범위에서 소수점 한 자리까지 입력해주세요.');
      if (note.length > 80) error('note', '메모는 80자 이내로 입력해주세요.');
      const $invalid = $root.find('[aria-invalid="true"]').first();
      if ($invalid.length) { $invalid.trigger('focus'); return; }
      if (records.some(r => r.date === date) && !window.confirm(date + ' 기록이 있습니다. 입력한 내용으로 교체할까요?')) return;
      records = records.filter(r => r.date !== date); records.push({date, weight: Number(raw), note, example: false});
      save(); render(); $('#wl-status').text(date + ' 기록을 저장했습니다.'); $('#wl-weight, #wl-note').val(''); $('#wl-weight').trigger('focus');
    });
    $('#wl-rows').on('click', '[data-delete]', function () {
      const date = $(this).attr('data-delete'); records = records.filter(r => r.date !== date); save(); render();
      $('#wl-status').text(date + ' 기록을 삭제했습니다.');
      const next = $('#wl-rows button').first(); (next.length ? next : $('#wl-weight')).trigger('focus');
    });
    $('#wl-clear').on('click', function () { records = records.filter(r => !r.example); save(); render(); $('#wl-status').text('예시 기록을 지웠습니다. 나의 체중을 기록해주세요.'); $('#wl-weight').trigger('focus'); });
    $root.find('[data-days]').on('click', function () { period = Number($(this).data('days')); $root.find('[data-days]').attr('aria-pressed', 'false'); $(this).attr('aria-pressed', 'true'); render(); });
    $('#wl-target').on('input.weightLog change.weightLog', function () {
      const valid = target() !== null;
      $(this).attr('aria-invalid', String(!valid));
      $('#wl-target-error').text(valid ? '' : '20~200kg 범위에서 소수점 한 자리까지 입력해주세요.');
      save(); render();
    });
    $('#wl-date').val(localKey()).attr('max', localKey());
    $('#wl-date-error, #wl-weight-error, #wl-note-error').attr('aria-live', 'polite');
    load(); render();
  });
})(jQuery);

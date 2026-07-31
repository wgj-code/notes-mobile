#!/bin/bash
# 集成测试：测试 Edge Function 连通性
# 用法: bash scripts/test-integration.sh
# 在 ④ 测试阶段运行，确保服务端组件可用

set -e

echo "=== 集成测试：Edge Function 连通性 ==="

# Supabase 配置
SUPABASE_URL="https://quhjzvovghpkflvknqkh.supabase.co"
SUPABASE_ANON_KEY="sb_publishable_f9ttaK2JNm54d78Nz4pWqg_iBCW_pRv"

# 测试函数列表
FUNCTIONS=(
  "note-generate"
  "voice-notes-generate"
  "tts"
)

PASSED=0
FAILED=0

for func in "${FUNCTIONS[@]}"; do
  echo ""
  echo "测试: $func"

  # 发送测试请求
  RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "${SUPABASE_URL}/functions/v1/${func}" \
    -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
    -H "Content-Type: application/json" \
    -d '{"prompt": "测试连接"}' \
    --connect-timeout 10 \
    --max-time 30 2>/dev/null || echo -e "\n000")

  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | head -n -1)

  if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
    echo "  ✅ 通过 (HTTP $HTTP_CODE)"
    PASSED=$((PASSED + 1))
  elif [ "$HTTP_CODE" -eq 000 ]; then
    echo "  ❌ 失败 (连接超时)"
    FAILED=$((FAILED + 1))
  else
    echo "  ❌ 失败 (HTTP $HTTP_CODE)"
    echo "  响应: $BODY"
    FAILED=$((FAILED + 1))
  fi
done

echo ""
echo "=== 测试结果 ==="
echo "通过: $PASSED"
echo "失败: $FAILED"

if [ $FAILED -gt 0 ]; then
  echo ""
  echo "❌ 集成测试失败！请检查 Edge Function 部署状态。"
  echo "运行: bash repos/notes-backend/scripts/deploy-backend.sh"
  exit 1
else
  echo ""
  echo "✅ 集成测试全部通过！"
fi

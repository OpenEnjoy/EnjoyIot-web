<template>
  <div
    :class="prefixCls"
    class="relative h-[100%] lt-md:px-10px lt-sm:px-10px lt-xl:px-10px lt-xl:px-10px"
  >
    <div class="absolute top-0 left-0 w-full h-full overflow-hidden">
      <div class="particle" style="width: 100px; height: 100px; top: 10%; left: 10%;"></div>
      <div class="particle" style="width: 150px; height: 150px; top: 20%; right: 20%;"></div>
      <div class="particle" style="width: 80px; height: 80px; bottom: 15%; left: 25%;"></div>
      <div class="particle" style="width: 120px; height: 120px; bottom: 20%; right: 15%;"></div>
    </div>
    <div class="login-box flex">
      <div class="login-l flex-1">
        <img src="@/assets/imgs/login_bg.jpg" 
          alt="科技插图" 
          class="w-full mb-8"
        />
        <h2 class="text-2xl font-bold mb-4">智能物联管理平台</h2>
        <p class="text-gray-400 text-center">打造智能化、数字化的物联网管理解决方案</p>
      </div>
      <div class="login-r flex-1">
        <!-- 右边的登录界面 -->
        <Transition appear enter-active-class="animate__animated animate__bounceInRight">
          <div
            class="m-auto h-[calc(100%-60px)] w-[100%] flex items-center at-2xl:max-w-500px at-lg:max-w-500px at-md:max-w-500px at-xl:max-w-500px"
          >
            <!-- 账号登录 -->
            <LoginForm class="m-auto h-auto p-50px lt-xl:(rounded-3xl light:bg-white)" />
            <!-- 忘记密码 -->
            <!-- <ForgetPasswordForm class="m-auto h-auto p-20px lt-xl:(rounded-3xl light:bg-white)" /> -->
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { underlineToHump } from '@/utils'

import { useDesign } from '@/hooks/web/useDesign'
import { useAppStore } from '@/store/modules/app'
import { ThemeSwitch } from '@/layout/components/ThemeSwitch'
import { LocaleDropdown } from '@/layout/components/LocaleDropdown'

import {
  LoginForm,
  MobileForm,
  QrCodeForm,
  RegisterForm,
  SSOLoginVue,
  ForgetPasswordForm
} from './components'

defineOptions({ name: 'Login' })

const { t } = useI18n()
const appStore = useAppStore()
const { getPrefixCls } = useDesign()
const prefixCls = getPrefixCls('login')
</script>

<style lang="scss" scoped>
$prefix-cls: #{$namespace}-login;
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}
.particle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  pointer-events: none;
  animation: float 6s infinite ease-in-out;
}
.#{$prefix-cls} {
  overflow: auto;
  background: linear-gradient(135deg, #1a1f35 0%, #2a3149 100%);
  .login-box {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    border-radius: 20px;
    overflow: hidden;
    max-width: 70%;
    width: 90%;
    .login-l {
      background: rgba(255, 255, 255, 0.03);
      backdrop-filter: blur(10px);
      padding: 70px;
      color: #fff;
      text-align: center;
    }
    .login-r {
      background-color: #fff;
    }
  }
  &__left {
    &::before {
      position: absolute;
      top: 0;
      left: 0;
      z-index: -1;
      width: 100%;
      height: 100%;
      background-image: url('@/assets/svgs/login-bg.svg');
      background-position: center;
      background-repeat: no-repeat;
      content: '';
    }
  }
}
</style>

<style lang="scss">
.dark .login-form {
  .el-divider__text {
    background-color: var(--login-bg-color);
  }

  .el-card {
    background-color: var(--login-bg-color);
  }
}
</style>

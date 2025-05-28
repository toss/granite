<template>
  <section>
    <div class="asset-example">
      <img v-if="assetType === 'image'" :src="prefixedAssetPath" />
      <video v-if="assetType === 'video'" controls>
        <source :src="prefixedAssetPath" type="video/webm" />
      </video>
    </div>
    <slot></slot>
    <div class="clear-both"></div>
  </section>
</template>

<script>
export default {
  props: {
    assetType: {
      type: String,
      default: 'image',
      required: false,
    },
    assetPath: {
      type: String,
      required: true,
    },
  },
  computed: {
    prefixedAssetPath() {
      // BASE_URL과 assetPath를 연결하면서 중복된 슬래시를 제거합니다.
      const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, ''); // 끝 슬래시 제거
      const assetPath = this.assetPath.replace(/^\//, ''); // 앞 슬래시 제거
      return `${baseUrl}/${assetPath}`; // 슬래시로 연결
    },
  },
};
</script>

<style scoped>
.asset-example {
  float: right;
  max-width: 33%;
  width: 250px;
  margin-left: 24px;
}

.asset-example > img {
  border: 1px solid var(--vp-c-divider);
}

.clear-both {
  clear: both;
}
</style>

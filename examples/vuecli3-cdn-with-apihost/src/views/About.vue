<template>
  <div class="about">
    <h1>This is an about page</h1>
    <div>{{msg}}</div>
  </div>
</template>

<script>
import axios from 'axios'
export default {
  name: 'About',
  data () {
    return {
      msg: ''
    }
  },
  async mounted () {
    try {
      const data = await axios.get('http://api.abcd.com')
      this.msg = data
    } catch (e) {
      this.msg = e.message
    }
  }
}
</script>

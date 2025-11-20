<script setup lang="ts">
import { onMounted, onBeforeUnmount, computed, ref } from "vue";
import { useRouter } from "vue-router";
import useApplicationStore from "@/store";
import { ElMessage, ElMessageBox } from "element-plus";
import dayjs from "dayjs";

interface iOptions {
  value: string,
  label: string
};

interface tareData {
  tare_id: number,
  tare_amount: number,
  tare_type: string
};

interface docItemsData {
  material_id: number,
  material: string,
  tare_id: number,
  tare_amount: number,
  tare_type: string
};


const router = useRouter();
const store = useApplicationStore();

const num = ref()
const handleChange = (value: number | undefined) => {
  console.log(value)
  console.log(tare_array)
}

const doc_num = ref('');
const doc_date = ref(new Date());
const doc_operation = ref('');
const doc_material = ref('');
const doc_material_set = new Set();
const doc_tare_type = ref('');
const doc_material_options = ref([<iOptions>{}]);
const tare_type_options = [
  {
    value: 'б/м 15',
    label: 'б/м 15',
  },
  {
    value: 'б/м 16',
    label: 'б/м 16',
  },
  {
    value: 'мкр',
    label: 'мкр',
  },
]

const doc_items_array = ref([<docItemsData>{}]);
doc_items_array.value = [
  {material_id: 5155, material: 'тест 100 продукт',  tare_id: 124, tare_amount: 250, tare_type: 'б/м 15'},
  {material_id: 5155, material: 'тест 100 продукт',  tare_id: 125, tare_amount: 260, tare_type: 'б/м 15'},
  {material_id: 5156, material: 'тест 101 продукт',  tare_id: 126, tare_amount: 260, tare_type: 'б/м 15'},
  {material_id: 5156, material: 'тест 101 продукт',  tare_id: 127, tare_amount: 260, tare_type: 'б/м 15'},
  {material_id: 5156, material: 'тест 101 продукт',  tare_id: 128, tare_amount: 260, tare_type: 'б/м 15'},
];  



const tare_array = ref([<tareData>{}]);

tare_array.value = [
  {tare_id: 124, tare_amount: 250, tare_type: 'б/м 15'},
  {tare_id: 125, tare_amount: 260, tare_type: 'б/м 15'},
  {tare_id: 126, tare_amount: 260, tare_type: 'б/м 15'},
  {tare_id: 127, tare_amount: 260, tare_type: 'б/м 15'},
  {tare_id: 128, tare_amount: 260, tare_type: 'б/м 15'},
];  

function addMaterialOptionElement(material) {
    let element = <iOptions>{};

    element.label = material; 
    element.value = material; 
    return element;
};

function makeMaterialOption() {
     doc_items_array.value.forEach(element => {
      doc_material_set.add(element.material) 
     });
     doc_material_options.value.length = 0
     doc_material_set.forEach(function(value) {
      const element = addMaterialOptionElement(value);
      doc_material_options.value.push(element);
      doc_material.value = doc_material_options.value[0].value 
    });

};

 onMounted(async () => {

     //await store.fetchOperation(props.stockID, props.operationID);
     makeMaterialOption()
});


</script>

<template v-if="store.isAuth">
    <el-row :gutter="20">
      <el-col :span="8"><div class="grid-content ep-bg-purple" />
        Количество позиций: 
        <el-input-number v-model="num" :min="1" :max="10" @change="handleChange" />
          <div>
            <el-input clearable
              v-model="doc_num"
              style="max-width: 300px"
              placeholder="Номер документа"
              @change="handleChange"
            >
            </el-input>
            <el-input clearable
              type="date"
              v-model="doc_date"
              style="max-width: 150px"
              @change="handleChange"
            >
            </el-input>
          </div>
          <div>
            <el-input disabled
              v-model="doc_operation"
              style="max-width: 450px"
              placeholder="Операция"
              @change="handleChange"
            >
            </el-input>
          </div>
          <el-select v-model="doc_material" placeholder="Материал" style="width: 300px">
          <el-option
            v-for="item in doc_material_options"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
          </el-select> 
          <el-select v-model="doc_tare_type" placeholder="Тара" style="width: 150px">
          <el-option
            v-for="item in tare_type_options"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
          </el-select>

      </el-col>
      <el-col :span="6"><div class="grid-content ep-bg-purple" />
        <div v-for="tare_item in tare_array" :key="tare_item.tare_id">
          <el-input
            v-model="tare_item.tare_amount"
            style="max-width: 200px"
            placeholder=""
            type="number"
            @change="handleChange"
          >
            <template #prepend>Номер {{tare_item.tare_id}}</template>
          </el-input>
          <el-select v-model="tare_item.tare_type" placeholder="Тара" style="width: 100px">
            <el-option
              v-for="item in tare_type_options"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>

        </div>
      </el-col>
    </el-row>


</template>

.el-row {
  margin-bottom: 20px;
}
.el-row:last-child {
  margin-bottom: 0;
}
.el-col {
  border-radius: 4px;
}

.grid-content {
  border-radius: 4px;
  min-height: 36px;
}
